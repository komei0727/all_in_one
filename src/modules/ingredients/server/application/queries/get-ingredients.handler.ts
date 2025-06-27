import { IngredientListDto } from '../dtos/ingredient-list.dto'
import { IngredientMapper } from '../mappers/ingredient.mapper'

import type { GetIngredientsQuery } from './get-ingredients.query'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'

/**
 * 食材一覧取得ハンドラー
 */
export class GetIngredientsHandler {
  constructor(private readonly ingredientRepository: IngredientRepository) {}

  async execute(query: GetIngredientsQuery): Promise<IngredientListDto> {
    // 検索条件を構築
    const criteria = {
      userId: query.userId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      categoryId: query.categoryId,
      expiryStatus: query.expiryStatus,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    // 食材を取得
    const [ingredients, total] = await Promise.all([
      this.ingredientRepository.findMany(criteria),
      this.ingredientRepository.count({
        userId: query.userId,
        search: query.search,
        categoryId: query.categoryId,
        expiryStatus: query.expiryStatus,
      }),
    ])

    // DTOに変換
    const items = ingredients.map((ingredient) => IngredientMapper.toDto(ingredient))

    return IngredientListDto.create({
      items,
      total,
      page: query.page,
      limit: query.limit,
    })
  }
}
