import { createId } from '@paralleldrive/cuid2'

import { PrefixedCuidId, ID_PREFIXES } from '@/modules/shared/server/domain/value-objects'

/**
 * 食材在庫ID値オブジェクト
 * プレフィックス付きCUID形式の識別子を表現する
 */
export class IngredientStockId extends PrefixedCuidId {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return '食材在庫ID'
  }

  /**
   * IDのプレフィックスを取得
   * @returns プレフィックス
   */
  protected getPrefix(): string {
    return ID_PREFIXES.ingredientStock
  }

  /**
   * 新しい食材在庫IDを生成
   * @returns 新しい食材在庫ID
   */
  static generate(): IngredientStockId {
    return new IngredientStockId(ID_PREFIXES.ingredientStock + createId())
  }
}
