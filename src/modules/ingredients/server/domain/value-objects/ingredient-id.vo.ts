import { createId } from '@paralleldrive/cuid2'

import { PrefixedCuidId, ID_PREFIXES } from '@/modules/shared/server/domain/value-objects'

/**
 * 食材ID値オブジェクト
 * プレフィックス付きCUID形式の識別子を表現する
 */
export class IngredientId extends PrefixedCuidId {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return '食材ID'
  }

  /**
   * IDのプレフィックスを取得
   * @returns プレフィックス
   */
  protected getPrefix(): string {
    return ID_PREFIXES.ingredient
  }

  /**
   * 新しい食材IDを生成
   * @returns 新しい食材ID
   */
  static generate(): IngredientId {
    return new IngredientId(ID_PREFIXES.ingredient + createId())
  }
}
