import type { PrismaClient, Ingredient, Prisma } from '@/generated/prisma'

import { INGREDIENT_STATUS, PAGINATION_DEFAULTS } from '../../../shared/constants'
import { IngredientEntity, type IngredientStatus } from '../../domain/entities/ingredient'
import type {
  IIngredientRepository,
  FindAllParams,
  FindAllResult,
} from '../../domain/repositories/ingredient-repository.interface'

export class PrismaIngredientRepository implements IIngredientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(params: FindAllParams): Promise<FindAllResult> {
    const {
      page = PAGINATION_DEFAULTS.PAGE,
      limit = PAGINATION_DEFAULTS.LIMIT,
      status,
      category,
      sort,
      order = 'asc',
    } = params

    const where: Prisma.IngredientWhereInput = {}

    if (status) {
      // Map API status to database status
      // Note: The database doesn't have a status field, so we'll need to calculate it
      // For now, we'll filter based on quantity
      if (status === INGREDIENT_STATUS.OUT) {
        where.quantity = 0
      } else if (status === INGREDIENT_STATUS.LOW) {
        where.AND = [
          { quantity: { gt: 0 } },
          { quantity: { lte: 5 } }, // Arbitrary threshold for "low"
        ]
      }
    }

    if (category) {
      where.category = {
        name: category,
      }
    }

    const orderBy: Prisma.IngredientOrderByWithRelationInput | undefined = sort
      ? { [this.mapSortField(sort)]: order }
      : undefined

    const [items, total] = await Promise.all([
      this.prisma.ingredient.findMany({
        where,
        include: {
          category: true,
          unit: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.ingredient.count({ where }),
    ])

    return {
      items: items.map((item) => this.toDomainEntity(item)),
      total,
    }
  }

  async findById(id: string): Promise<IngredientEntity | null> {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        category: true,
        unit: true,
      },
    })

    return ingredient ? this.toDomainEntity(ingredient) : null
  }

  async findExpiringWithinDays(days: number): Promise<IngredientEntity[]> {
    const today = new Date()
    const expirationThreshold = new Date()
    expirationThreshold.setDate(today.getDate() + days)

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        expiryDate: {
          lte: expirationThreshold,
        },
      },
      include: {
        category: true,
        unit: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    })

    return ingredients.map((item) => this.toDomainEntity(item))
  }

  async create(ingredient: IngredientEntity): Promise<IngredientEntity> {
    const data = await this.toPrismaData(ingredient)

    const created = await this.prisma.ingredient.create({
      data: data as Prisma.IngredientCreateInput,
      include: {
        category: true,
        unit: true,
      },
    })

    return this.toDomainEntity(created)
  }

  async update(ingredient: IngredientEntity): Promise<IngredientEntity> {
    const data = await this.toPrismaData(ingredient)

    const updated = await this.prisma.ingredient.update({
      where: { id: ingredient.id },
      data: data as Prisma.IngredientUpdateInput,
      include: {
        category: true,
        unit: true,
      },
    })

    return this.toDomainEntity(updated)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ingredient.delete({
      where: { id },
    })
  }

  private mapSortField(sort: 'name' | 'expirationDate' | 'updatedAt'): string {
    const sortMap: Record<string, string> = {
      expirationDate: 'expiryDate',
      updatedAt: 'updatedAt',
      name: 'name',
    }
    return sortMap[sort] || 'updatedAt'
  }

  private toDomainEntity(
    ingredient: Ingredient & {
      category: { id: string; name: string } | null
      unit: { id: string; name: string } | null
    }
  ): IngredientEntity {
    // Create entity without status first
    const entity = new IngredientEntity({
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity || undefined,
      unit: ingredient.unit?.name,
      expirationDate: ingredient.expiryDate || undefined,
      category: ingredient.category?.name,
      status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus, // temporary status
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
    })

    // Calculate and update status based on quantity
    entity.updateStatusBasedOnQuantity()

    return entity
  }

  private async toPrismaData(
    ingredient: IngredientEntity
  ): Promise<Prisma.IngredientCreateInput | Prisma.IngredientUpdateInput> {
    const data: Record<string, unknown> = {
      name: ingredient.name,
      quantity: ingredient.quantity || 0,
      expiryDate: ingredient.expirationDate || null,
      purchaseDate: new Date(), // Default to now if not provided
      storageLocation: 'ROOM_TEMPERATURE', // Default value
    }

    // Connect unit if provided
    if (ingredient.unit) {
      const unit = await this.prisma.unit.findUnique({
        where: { name: ingredient.unit },
      })
      if (unit) {
        data.unit = { connect: { id: unit.id } }
      }
    }

    // Connect category if provided
    if (ingredient.category) {
      const category = await this.prisma.category.findUnique({
        where: { name: ingredient.category },
      })
      if (category) {
        data.category = { connect: { id: category.id } }
      }
    }

    return data as Prisma.IngredientCreateInput
  }
}
