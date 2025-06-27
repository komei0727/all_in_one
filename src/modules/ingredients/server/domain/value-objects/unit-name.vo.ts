import { Name } from '@/modules/shared/server/domain/value-objects'

/**
 * 単位名値オブジェクト
 *
 * 単位の名称を表す値オブジェクト
 * ビジネスルール:
 * - 必須（空文字不可）
 * - 最大30文字
 * - 前後の空白は自動的にトリミング
 */
export class UnitName extends Name {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return '単位名'
  }

  /**
   * 最大文字数を取得
   * @returns 最大文字数
   */
  protected getMaxLength(): number {
    return 30
  }

  /**
   * 新しいUnitNameインスタンスを生成
   *
   * @param value 単位名
   * @returns UnitNameインスタンス
   */
  static create(value: string): UnitName {
    return new UnitName(value)
  }
}
