import { Specification } from '@/modules/shared/server/domain/specifications/specification.base'

import { Ingredient } from '../entities/ingredient.entity'

/**
 * 在庫切れ仕様
 * 在庫量が0以下の食材を特定する
 */
export class OutOfStockSpecification extends Specification<Ingredient> {
  /**
   * 食材が在庫切れかどうかを判定
   * @param ingredient 判定対象の食材
   * @returns 在庫量が0以下の場合true
   */
  isSatisfiedBy(ingredient: Ingredient): boolean {
    // 食材の在庫情報を取得
    const stock = ingredient.getIngredientStock()

    // 在庫量を取得
    const quantity = stock.getQuantity()

    // 在庫量が0以下の場合true
    return quantity <= 0
  }
}
