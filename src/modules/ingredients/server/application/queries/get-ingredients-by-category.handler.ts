import { NotFoundException } from '../../domain/exceptions'
import { CategoryId } from '../../domain/value-objects'
import { IngredientsByCategoryDto } from '../dtos/ingredients-by-category.dto'

import type { Ingredient } from '../../domain/entities/ingredient.entity'
import type { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'

/**
 * カテゴリー別食材取得クエリ
 */
export interface GetIngredientsByCategoryQuery {
  categoryId: string
  userId: string
  sortBy: 'stockStatus' | 'name'
}

/**
 * カテゴリー別食材取得ハンドラー
 * 指定されたカテゴリーの食材を買い物用の軽量フォーマットで取得する
 */
export class GetIngredientsByCategoryHandler {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly ingredientRepository: IngredientRepository
  ) {}

  /**
   * カテゴリー別食材を取得する
   * @param query クエリパラメータ
   * @returns カテゴリー別食材DTO
   * @throws {NotFoundException} カテゴリーが見つからない場合
   */
  async handle(query: GetIngredientsByCategoryQuery): Promise<IngredientsByCategoryDto> {
    // カテゴリーIDの値オブジェクトを作成
    const categoryId = new CategoryId(query.categoryId)

    // カテゴリーの存在確認
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) {
      throw new NotFoundException('カテゴリー', query.categoryId)
    }

    // カテゴリーに属する食材を取得
    const ingredients = await this.ingredientRepository.findByCategory(
      query.userId,
      categoryId.getValue()
    )

    // ソート処理
    const sortedIngredients = this.sortIngredients(ingredients, query.sortBy)

    // DTOに変換して返す
    return IngredientsByCategoryDto.fromDomain({
      category,
      ingredients: sortedIngredients,
    })
  }

  /**
   * 食材をソートする
   * @param ingredients 食材リスト
   * @param sortBy ソート項目
   * @returns ソート済み食材リスト
   */
  private sortIngredients(ingredients: Ingredient[], sortBy: 'stockStatus' | 'name'): Ingredient[] {
    if (sortBy === 'stockStatus') {
      // 在庫ステータス順（OUT_OF_STOCK → LOW_STOCK → IN_STOCK）
      return [...ingredients].sort((a, b) => {
        // 在庫ステータスを判定
        const getStatusOrder = (ingredient: Ingredient): number => {
          if (ingredient.getIngredientStock().isOutOfStock()) return 0
          if (ingredient.getIngredientStock().isLowStock()) return 1
          return 2 // IN_STOCK
        }

        const aOrder = getStatusOrder(a)
        const bOrder = getStatusOrder(b)

        if (aOrder !== bOrder) {
          return aOrder - bOrder
        }
        // 同じステータスの場合は名前順
        return a.getName().getValue().localeCompare(b.getName().getValue())
      })
    } else {
      // 名前順
      return [...ingredients].sort((a, b) =>
        a.getName().getValue().localeCompare(b.getName().getValue())
      )
    }
  }
}
