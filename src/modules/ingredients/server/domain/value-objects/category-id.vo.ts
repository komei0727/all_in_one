import { ValueObject } from './value-object.base'

/**
 * カテゴリーID値オブジェクト
 *
 * カテゴリーの識別子を表す値オブジェクト
 * ビジネスルール:
 * - 必須（空文字不可）
 * - 一意性はリポジトリ層で保証
 */
export class CategoryId extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('カテゴリーIDは必須です')
    }
  }

  /**
   * 新しいCategoryIdインスタンスを生成
   *
   * @param value カテゴリーIDの値
   * @returns CategoryIdインスタンス
   */
  static create(value: string): CategoryId {
    return new CategoryId(value)
  }
}
