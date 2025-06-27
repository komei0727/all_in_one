import { Specification } from '@/modules/shared/server/domain/specifications/specification.base'

import type { Ingredient } from '../entities/ingredient.entity'

/**
 * 在庫不足仕様
 * 指定された閾値以下の在庫量の食材を特定する
 */
export class LowStockSpecification extends Specification<Ingredient> {
  /**
   * @param threshold 在庫不足と判定する閾値（0以上）
   * @throws {Error} 閾値が負の場合
   */
  constructor(private readonly threshold: number) {
    super()
    if (threshold < 0) {
      throw new Error('Threshold must be non-negative')
    }
  }

  /**
   * 食材が在庫不足かどうかを判定
   * @param ingredient 判定対象の食材
   * @returns 在庫量が閾値以下の場合true
   */
  isSatisfiedBy(ingredient: Ingredient): boolean {
    // 食材の在庫情報を取得
    const stock = ingredient.getIngredientStock()

    // 在庫量を取得
    const quantity = stock.getQuantity()

    // 在庫量が閾値以下の場合true
    return quantity <= this.threshold
  }
}
