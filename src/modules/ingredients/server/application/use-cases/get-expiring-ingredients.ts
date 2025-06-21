import { DEFAULT_EXPIRING_DAYS } from '../../../shared/constants'
import type { GetExpiringIngredientsParams, IngredientResponse } from '../../../shared/types/api'
import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import { IngredientMapper } from '../mappers/ingredient-mapper'

export class GetExpiringIngredientsUseCase {
  constructor(private readonly repository: IIngredientRepository) {}

  async execute(params: GetExpiringIngredientsParams): Promise<IngredientResponse[]> {
    const days = params.days ?? DEFAULT_EXPIRING_DAYS
    const items = await this.repository.findExpiringWithinDays(days)

    return items.map((entity) => IngredientMapper.toResponse(entity))
  }
}
