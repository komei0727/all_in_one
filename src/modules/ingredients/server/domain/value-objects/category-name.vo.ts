import { Name } from '@/modules/shared/server/domain/value-objects'

/**
 * カテゴリー名値オブジェクト
 *
 * カテゴリーの名称を表す値オブジェクト
 * ビジネスルール:
 * - 必須（空文字不可）
 * - 最大20文字
 * - 前後の空白は自動的にトリミング
 */
export class CategoryName extends Name {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return 'カテゴリー名'
  }

  /**
   * 最大文字数を取得
   * @returns 最大文字数
   */
  protected getMaxLength(): number {
    return 20
  }

  /**
   * 新しいCategoryNameインスタンスを生成
   *
   * @param value カテゴリー名
   * @returns CategoryNameインスタンス
   */
  static create(value: string): CategoryName {
    return new CategoryName(value)
  }
}
