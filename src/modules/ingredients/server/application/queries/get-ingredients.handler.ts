import { CategoryId, UnitId } from '../../domain/value-objects'
import { IngredientListDto } from '../dtos/ingredient-list.dto'
import { IngredientMapper } from '../mappers/ingredient.mapper'

import type { GetIngredientsQuery } from './get-ingredients.query'
import type { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '../../domain/repositories/unit-repository.interface'

/**
 * 食材一覧取得ハンドラー
 */
export class GetIngredientsHandler {
  constructor(
    private readonly ingredientRepository: IngredientRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly unitRepository: UnitRepository
  ) {}

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

    // カテゴリーと単位の情報を取得
    const categoryIds = [...new Set(ingredients.map((i) => i.getCategoryId().getValue()))]
    const unitIds = [
      ...new Set(ingredients.map((i) => i.getIngredientStock().getUnitId().getValue())),
    ]

    const [categories, units] = await Promise.all([
      Promise.all(categoryIds.map((id) => this.categoryRepository.findById(new CategoryId(id)))),
      Promise.all(unitIds.map((id) => this.unitRepository.findById(new UnitId(id)))),
    ])

    const categoryMap = new Map(categories.filter((c) => c).map((c) => [c!.id.getValue(), c!]))
    const unitMap = new Map(units.filter((u) => u).map((u) => [u!.id.getValue(), u!]))

    // DTOに変換
    const items = ingredients.map((ingredient) => {
      const category = categoryMap.get(ingredient.getCategoryId().getValue())
      const unit = unitMap.get(ingredient.getIngredientStock().getUnitId().getValue())
      return IngredientMapper.toDto(ingredient, category, unit)
    })

    return IngredientListDto.create({
      items,
      total,
      page: query.page,
      limit: query.limit,
    })
  }
}
