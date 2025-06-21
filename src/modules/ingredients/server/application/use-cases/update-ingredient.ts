import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { UpdateIngredientInput } from '../../../shared/validations/schemas'
import type { IngredientResponse } from '../../../shared/types/api'
import { IngredientEntity } from '../../domain/entities/ingredient'
import { IngredientMapper } from '../mappers/ingredient-mapper'
import { IngredientNotFoundError } from '../errors'

export class UpdateIngredientUseCase {
  constructor(private readonly repository: IIngredientRepository) {}

  async execute(id: string, input: UpdateIngredientInput): Promise<IngredientResponse> {
    const existing = await this.repository.findById(id)

    if (!existing) {
      throw new IngredientNotFoundError(id)
    }

    const existingData = existing.toObject()

    // Create updated entity with merged data
    const updatedEntity = new IngredientEntity({
      id: existingData.id,
      name: input.name ?? existingData.name,
      quantity: input.quantity !== undefined ? input.quantity : existingData.quantity,
      unit: input.unit !== undefined ? input.unit : existingData.unit,
      expirationDate: input.expirationDate !== undefined
        ? (input.expirationDate ? new Date(input.expirationDate) : undefined)
        : existingData.expirationDate,
      category: input.category !== undefined ? input.category : existingData.category,
      status: input.status ?? existingData.status,
      createdAt: existingData.createdAt,
      updatedAt: new Date(),
    })

    const updated = await this.repository.update(updatedEntity)

    return IngredientMapper.toResponse(updated)
  }
}