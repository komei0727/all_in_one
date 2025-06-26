import { createId } from '@paralleldrive/cuid2'

import { PrefixedCuidId, ID_PREFIXES } from '@/modules/shared/server/domain/value-objects'

/**
 * カテゴリーID値オブジェクト
 *
 * カテゴリーの識別子を表す値オブジェクト
 * プレフィックス付きCUID形式の識別子を表現する
 */
export class CategoryId extends PrefixedCuidId {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return 'カテゴリーID'
  }

  /**
   * IDのプレフィックスを取得
   * @returns プレフィックス
   */
  protected getPrefix(): string {
    return ID_PREFIXES.category
  }

  /**
   * 新しいカテゴリーIDを生成
   * @returns 新しいカテゴリーID
   */
  static generate(): CategoryId {
    return new CategoryId(ID_PREFIXES.category + createId())
  }

  /**
   * 新しいCategoryIdインスタンスを生成（後方互換性のため維持）
   *
   * @param value カテゴリーIDの値
   * @returns CategoryIdインスタンス
   * @deprecated generate()を使用してください
   */
  static create(value: string): CategoryId {
    return new CategoryId(value)
  }
}
