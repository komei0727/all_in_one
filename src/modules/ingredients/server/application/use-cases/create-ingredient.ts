import type { IngredientResponse } from '../../../shared/types/api'
import type { CreateIngredientInput } from '../../../shared/validations/schemas'
import { IngredientEntity } from '../../domain/entities/ingredient'
import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import { IngredientMapper } from '../mappers/ingredient-mapper'

export class CreateIngredientUseCase {
  constructor(
    private readonly repository: IIngredientRepository,
    private readonly generateId: () => string = () => crypto.randomUUID()
  ) {}

  async execute(input: CreateIngredientInput): Promise<IngredientResponse> {
    const now = new Date()
    const entity = IngredientEntity.create({
      id: this.generateId(),
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
      category: input.category,
      createdAt: now,
      updatedAt: now,
    })

    const created = await this.repository.create(entity)

    return IngredientMapper.toResponse(created)
  }
}
