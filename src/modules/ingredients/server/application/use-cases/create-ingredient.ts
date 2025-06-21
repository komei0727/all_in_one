import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { CreateIngredientInput } from '../../../shared/validations/schemas'
import type { IngredientResponse } from '../../../shared/types/api'
import { IngredientEntity } from '../../domain/entities/ingredient'
import { IngredientMapper } from '../mappers/ingredient-mapper'
import { INGREDIENT_STATUS } from '../../../shared/constants'

export class CreateIngredientUseCase {
  constructor(
    private readonly repository: IIngredientRepository,
    private readonly generateId: () => string = () => crypto.randomUUID()
  ) {}

  async execute(input: CreateIngredientInput): Promise<IngredientResponse> {
    // Determine initial status based on quantity
    let status: (typeof INGREDIENT_STATUS)[keyof typeof INGREDIENT_STATUS]
    if (input.quantity === 0) {
      status = INGREDIENT_STATUS.OUT
    } else if (input.quantity !== undefined && input.quantity < 5) {
      status = INGREDIENT_STATUS.LOW
    } else {
      status = INGREDIENT_STATUS.AVAILABLE
    }

    const now = new Date()
    const entity = new IngredientEntity({
      id: this.generateId(),
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
      category: input.category,
      status,
      createdAt: now,
      updatedAt: now,
    })

    const created = await this.repository.create(entity)

    return IngredientMapper.toResponse(created)
  }
}