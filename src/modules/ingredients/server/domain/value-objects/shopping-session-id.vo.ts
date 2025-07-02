import { createId } from '@paralleldrive/cuid2'

import { PrefixedCuidId } from '@/modules/shared/server/domain/value-objects'

/**
 * 買い物セッションのID値オブジェクト
 * ses_から始まるCUID形式のIDを管理する
 */
export class ShoppingSessionId extends PrefixedCuidId {
  private static readonly PREFIX = 'ses_'

  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return '買い物セッションID'
  }

  /**
   * IDのプレフィックスを取得
   * @returns プレフィックス
   */
  protected getPrefix(): string {
    return ShoppingSessionId.PREFIX
  }

  /**
   * 新しい買い物セッションIDを生成する
   */
  static create(): ShoppingSessionId {
    return new ShoppingSessionId(`${ShoppingSessionId.PREFIX}${createId()}`)
  }
}
