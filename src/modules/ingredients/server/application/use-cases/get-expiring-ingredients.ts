import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { GetExpiringIngredientsParams, GetExpiringIngredientsResponse } from '../../../shared/types/api'
import { IngredientMapper } from '../mappers/ingredient-mapper'
import { DEFAULT_EXPIRING_DAYS } from '../../../shared/constants'

export class GetExpiringIngredientsUseCase {
  constructor(private readonly repository: IIngredientRepository) {}

  async execute(params: GetExpiringIngredientsParams): Promise<GetExpiringIngredientsResponse> {
    const days = params.days ?? DEFAULT_EXPIRING_DAYS
    const items = await this.repository.findExpiringWithinDays(days)

    return {
      data: {
        items: items.map((entity) => IngredientMapper.toResponse(entity)),
        count: items.length,
      },
      success: true,
    }
  }
}