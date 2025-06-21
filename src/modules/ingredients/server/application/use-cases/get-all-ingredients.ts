import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { GetIngredientsParams, GetIngredientsResponse } from '../../../shared/types/api'
import { IngredientMapper } from '../mappers/ingredient-mapper'

export class GetAllIngredientsUseCase {
  constructor(private readonly repository: IIngredientRepository) {}

  async execute(params: GetIngredientsParams): Promise<GetIngredientsResponse> {
    const { items, total } = await this.repository.findAll(params)

    const totalPages = Math.max(1, Math.ceil(total / (params.limit || 20)))

    return {
      data: {
        items: items.map((entity) => IngredientMapper.toResponse(entity)),
        pagination: {
          total,
          page: params.page || 1,
          limit: params.limit || 20,
          totalPages,
        },
      },
      success: true,
    }
  }
}