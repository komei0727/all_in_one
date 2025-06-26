import { createId } from '@paralleldrive/cuid2'

import { PrefixedCuidId, ID_PREFIXES } from '@/modules/shared/server/domain/value-objects'

/**
 * 単位ID値オブジェクト
 *
 * 単位の識別子を表す値オブジェクト
 * プレフィックス付きCUID形式の識別子を表現する
 */
export class UnitId extends PrefixedCuidId {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return '単位ID'
  }

  /**
   * IDのプレフィックスを取得
   * @returns プレフィックス
   */
  protected getPrefix(): string {
    return ID_PREFIXES.unit
  }

  /**
   * 新しい単位IDを生成
   * @returns 新しい単位ID
   */
  static generate(): UnitId {
    return new UnitId(ID_PREFIXES.unit + createId())
  }

  /**
   * 新しいUnitIdインスタンスを生成（後方互換性のため維持）
   *
   * @param value 単位IDの値
   * @returns UnitIdインスタンス
   * @deprecated generate()を使用してください
   */
  static create(value: string): UnitId {
    return new UnitId(value)
  }
}
