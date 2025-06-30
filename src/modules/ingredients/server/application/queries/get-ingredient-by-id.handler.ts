import { IngredientNotFoundException } from '../../domain/exceptions'
import { IngredientId } from '../../domain/value-objects'
import { type IngredientDto } from '../dtos/ingredient.dto'
import { IngredientMapper } from '../mappers/ingredient.mapper'

import type { GetIngredientByIdQuery } from './get-ingredient-by-id.query'
import type { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '../../domain/repositories/unit-repository.interface'

/**
 * 食材詳細取得ハンドラー
 */
export class GetIngredientByIdHandler {
  constructor(
    private readonly ingredientRepository: IngredientRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly unitRepository: UnitRepository
  ) {}

  async execute(query: GetIngredientByIdQuery): Promise<IngredientDto> {
    // 食材IDの値オブジェクトを作成
    const ingredientId = new IngredientId(query.id)

    // 食材を取得
    const ingredient = await this.ingredientRepository.findById(query.userId, ingredientId)

    if (!ingredient) {
      throw new IngredientNotFoundException()
    }

    // 削除済みチェック
    if (ingredient.isDeleted()) {
      throw new IngredientNotFoundException()
    }

    // カテゴリーと単位の情報を取得
    const [category, unit] = await Promise.all([
      this.categoryRepository.findById(ingredient.getCategoryId()),
      this.unitRepository.findById(ingredient.getIngredientStock().getUnitId()),
    ])

    // DTOに変換して返す
    return IngredientMapper.toDto(ingredient, category || undefined, unit || undefined)
  }
}
