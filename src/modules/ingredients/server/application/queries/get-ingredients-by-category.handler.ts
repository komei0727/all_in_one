import { NotFoundException } from '../../domain/exceptions'
import { CategoryId } from '../../domain/value-objects'
import { IngredientsByCategoryDto } from '../dtos/ingredients-by-category.dto'

import type { Ingredient } from '../../domain/entities/ingredient.entity'
import type { Unit } from '../../domain/entities/unit.entity'
import type { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'
import type { UnitRepository } from '../../domain/repositories/unit-repository.interface'

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
    private readonly ingredientRepository: IngredientRepository,
    private readonly unitRepository: UnitRepository,
    private readonly shoppingSessionRepository: ShoppingSessionRepository
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

    // 単位情報を取得（食材で使用されている単位IDを収集）
    const unitIds = [...new Set(sortedIngredients.map((i) => i.getIngredientStock().getUnitId()))]
    const units = await Promise.all(unitIds.map((unitId) => this.unitRepository.findById(unitId)))

    // 単位IDと単位情報のマップを作成
    const unitMap = new Map<string, Unit>()
    units.forEach((unit) => {
      if (unit) {
        unitMap.set(unit.getId(), unit)
      }
    })

    // アクティブセッションを取得（存在しない場合はnull）
    const activeSession = await this.shoppingSessionRepository.findActiveByUserId(query.userId)

    // セッション内での確認履歴を取得
    const checkedItemsMap = new Map<string, Date>()
    if (activeSession) {
      const checkedItems = activeSession.getCheckedItems()
      checkedItems.forEach((item) => {
        checkedItemsMap.set(item.getIngredientId().getValue(), item.getCheckedAt())
      })
    }

    // DTOに変換して返す
    return IngredientsByCategoryDto.fromDomain({
      category,
      ingredients: sortedIngredients,
      unitMap,
      checkedItemsMap,
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
