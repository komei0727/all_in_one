import { PrismaClient, Prisma } from '@/generated/prisma'

import { IngredientStock } from '../../domain/entities/ingredient-stock.entity'
import { Ingredient } from '../../domain/entities/ingredient.entity'
import { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import {
  CategoryId,
  IngredientId,
  IngredientStockId,
  IngredientName,
  Memo,
  Price,
  Quantity,
  StorageLocation,
  StorageType,
  UnitId,
  ExpiryInfo,
} from '../../domain/value-objects'

/**
 * Prismaを使用した食材リポジトリの実装
 */
export class PrismaIngredientRepository implements IngredientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 食材を保存
   * @param ingredient 保存する食材
   * @returns 保存された食材
   */
  async save(ingredient: Ingredient): Promise<Ingredient> {
    const stock = ingredient.getCurrentStock()

    // トランザクションで食材と在庫を同時に保存
    const result = await this.prisma.$transaction(async (tx) => {
      // 食材の保存
      const savedIngredient = await tx.ingredient.upsert({
        where: { id: ingredient.getId().getValue() },
        update: {
          name: ingredient.getName().getValue(),
          categoryId: ingredient.getCategoryId().getValue(),
          memo: ingredient.getMemo()?.getValue() || null,
          updatedAt: ingredient.getUpdatedAt(),
        },
        create: {
          id: ingredient.getId().getValue(),
          name: ingredient.getName().getValue(),
          categoryId: ingredient.getCategoryId().getValue(),
          memo: ingredient.getMemo()?.getValue() || null,
          createdAt: ingredient.getCreatedAt(),
          updatedAt: ingredient.getUpdatedAt(),
        },
      })

      // 在庫の保存（ある場合）
      if (stock) {
        await tx.ingredientStock.create({
          data: {
            ingredientId: savedIngredient.id,
            quantity: stock.getQuantity().getValue(),
            unitId: stock.getUnitId().getValue(),
            storageLocationType: stock.getStorageLocation().getType(),
            storageLocationDetail: stock.getStorageLocation().getDetail() || null,
            bestBeforeDate: stock.getExpiryInfo().getBestBeforeDate(),
            expiryDate: stock.getExpiryInfo().getUseByDate(),
            purchaseDate: stock.getPurchaseDate(),
            price: stock.getPrice() ? new Prisma.Decimal(stock.getPrice()!.getValue()) : null,
            isActive: true,
          },
        })
      }

      return savedIngredient
    })

    // エンティティの再構築
    return this.toEntity(result, stock)
  }

  /**
   * IDで食材を検索
   * @param id 食材ID
   * @returns 食材（見つからない場合はnull）
   */
  async findById(id: IngredientId): Promise<Ingredient | null> {
    const result = await this.prisma.ingredient.findUnique({
      where: {
        id: id.getValue(),
        deletedAt: null, // 論理削除されていないもののみ
      },
      include: {
        stocks: {
          where: {
            isActive: true,
            deletedAt: null, // 論理削除されていないもののみ
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!result) {
      return null
    }

    const currentStock = result.stocks[0]
    const stock = currentStock ? this.toStock(currentStock) : null

    return this.toEntity(result, stock)
  }

  /**
   * 名前で食材を検索
   * @param name 食材名
   * @returns 食材（見つからない場合はnull）
   */
  async findByName(name: IngredientName): Promise<Ingredient | null> {
    const result = await this.prisma.ingredient.findFirst({
      where: {
        name: name.getValue(),
        deletedAt: null, // 論理削除されていないもののみ
      },
      include: {
        stocks: {
          where: {
            isActive: true,
            deletedAt: null, // 論理削除されていないもののみ
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!result) {
      return null
    }

    const currentStock = result.stocks[0]
    const stock = currentStock ? this.toStock(currentStock) : null

    return this.toEntity(result, stock)
  }

  /**
   * すべての食材を取得
   * @returns 食材のリスト
   */
  async findAll(): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        deletedAt: null, // 論理削除されていないもののみ
      },
      include: {
        stocks: {
          where: {
            isActive: true,
            deletedAt: null, // 論理削除されていないもののみ
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => {
      const currentStock = result.stocks[0]
      const stock = currentStock ? this.toStock(currentStock) : null
      return this.toEntity(result, stock)
    })
  }

  /**
   * 食材を削除
   * @param id 削除する食材のID
   */
  async delete(id: IngredientId): Promise<void> {
    // 論理削除の実装
    await this.prisma.ingredient.update({
      where: { id: id.getValue() },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  /**
   * Prismaの結果をエンティティに変換
   */
  private toEntity(
    data: {
      id: string
      name: string
      categoryId: string
      memo: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
      createdBy: string | null
      updatedBy: string | null
    },
    stock: IngredientStock | null
  ): Ingredient {
    const ingredient = new Ingredient({
      id: new IngredientId(data.id),
      name: new IngredientName(data.name),
      categoryId: new CategoryId(data.categoryId),
      memo: data.memo ? new Memo(data.memo) : null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    })

    if (stock) {
      ingredient.setStock(stock)
    }

    return ingredient
  }

  /**
   * Prismaの在庫データを在庫エンティティに変換
   */
  private toStock(data: {
    id: string
    quantity: number
    unitId: string
    storageLocationType: string
    storageLocationDetail: string | null
    bestBeforeDate: Date | null
    expiryDate: Date | null
    purchaseDate: Date
    price: Prisma.Decimal | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    createdBy: string | null
    updatedBy: string | null
  }): IngredientStock {
    return new IngredientStock({
      id: new IngredientStockId(data.id),
      quantity: new Quantity(data.quantity),
      unitId: new UnitId(data.unitId),
      storageLocation: new StorageLocation(
        data.storageLocationType as StorageType,
        data.storageLocationDetail || undefined
      ),
      expiryInfo: new ExpiryInfo({
        bestBeforeDate: data.bestBeforeDate,
        useByDate: data.expiryDate,
      }),
      purchaseDate: data.purchaseDate,
      price: data.price !== null ? new Price(data.price.toNumber()) : null,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    })
  }
}
