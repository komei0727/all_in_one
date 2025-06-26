import { Ingredient } from '../entities/ingredient.entity'

/**
 * 在庫必要量の定義
 */
export interface StockRequirement {
  ingredientId: string
  quantity: number
}

/**
 * カテゴリー別集計結果
 */
export interface CategoryAggregation {
  totalQuantity: number
  ingredientCount: number
}

/**
 * 在庫計算サービス
 * 複数食材の在庫計算や集計を行う
 */
export class StockCalculationService {
  /**
   * 食材が必要な在庫量を満たしているかチェック
   * @param ingredient 食材
   * @param requiredQuantity 必要な数量
   * @returns 充足している場合はtrue
   */
  hasEnoughStock(ingredient: Ingredient, requiredQuantity: number): boolean {
    const currentQuantity = ingredient.getIngredientStock().getQuantity()
    return currentQuantity >= requiredQuantity
  }

  /**
   * 複数食材の在庫充足チェック
   * @param ingredients 食材リスト
   * @param requirements 必要量リスト
   * @returns 食材IDごとの充足状況
   */
  checkMultipleStocks(
    ingredients: Ingredient[],
    requirements: StockRequirement[]
  ): Record<string, boolean> {
    const result: Record<string, boolean> = {}

    // 食材をIDでマップ化
    const ingredientMap = new Map<string, Ingredient>()
    ingredients.forEach((ingredient) => {
      ingredientMap.set(ingredient.getId().getValue(), ingredient)
    })

    // 各要求に対してチェック
    requirements.forEach((requirement) => {
      const ingredient = ingredientMap.get(requirement.ingredientId)
      if (!ingredient) {
        result[requirement.ingredientId] = false
      } else {
        result[requirement.ingredientId] = this.hasEnoughStock(ingredient, requirement.quantity)
      }
    })

    return result
  }

  /**
   * 在庫不足の食材を取得
   * @param ingredients 食材リスト
   * @param requirements 必要量リスト
   * @returns 在庫不足の食材リスト
   */
  getInsufficientIngredients(
    ingredients: Ingredient[],
    requirements: StockRequirement[]
  ): Ingredient[] {
    const stockStatus = this.checkMultipleStocks(ingredients, requirements)

    return ingredients.filter((ingredient) => {
      const ingredientId = ingredient.getId().getValue()
      return stockStatus[ingredientId] === false
    })
  }

  /**
   * カテゴリー別に在庫を集計
   * @param ingredients 食材リスト
   * @returns カテゴリー別の集計結果
   */
  aggregateByCategory(ingredients: Ingredient[]): Record<string, CategoryAggregation> {
    const aggregation: Record<string, CategoryAggregation> = {}

    ingredients.forEach((ingredient) => {
      // 削除済みの食材は除外
      if (ingredient.isDeleted()) {
        return
      }

      const categoryId = ingredient.getCategoryId().getValue()
      const quantity = ingredient.getIngredientStock().getQuantity()

      if (!aggregation[categoryId]) {
        aggregation[categoryId] = {
          totalQuantity: 0,
          ingredientCount: 0,
        }
      }

      aggregation[categoryId].totalQuantity += quantity
      aggregation[categoryId].ingredientCount += 1
    })

    return aggregation
  }

  /**
   * 特定単位の食材の合計在庫を計算
   * @param ingredients 食材リスト
   * @param unitId 単位ID
   * @returns 合計在庫量
   */
  calculateTotalStock(ingredients: Ingredient[], unitId: string): number {
    return ingredients.reduce((total, ingredient) => {
      // 削除済みの食材は除外
      if (ingredient.isDeleted()) {
        return total
      }

      // 指定単位の食材のみ集計
      const stock = ingredient.getIngredientStock()
      if (stock.getUnitId().getValue() === unitId) {
        return total + stock.getQuantity()
      }

      return total
    }, 0)
  }
}
