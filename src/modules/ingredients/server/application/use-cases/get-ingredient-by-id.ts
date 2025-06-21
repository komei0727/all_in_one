import type { IngredientResponse } from '../../../shared/types/api'
import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import { IngredientNotFoundError } from '../errors'
import { IngredientMapper } from '../mappers/ingredient-mapper'

export class GetIngredientByIdUseCase {
  constructor(private readonly repository: IIngredientRepository) {}

  async execute(id: string): Promise<IngredientResponse> {
    const ingredient = await this.repository.findById(id)

    if (!ingredient) {
      throw new IngredientNotFoundError(id)
    }

    return IngredientMapper.toResponse(ingredient)
  }
}
