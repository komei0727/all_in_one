import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'
import { RequiredFieldException, InvalidFieldException } from '../exceptions'

/**
 * カテゴリー名値オブジェクト
 *
 * カテゴリーの名称を表す値オブジェクト
 * ビジネスルール:
 * - 必須（空文字不可）
 * - 最大20文字
 * - 前後の空白は自動的にトリミング
 */
export class CategoryName extends ValueObject<string> {
  private static readonly MAX_LENGTH = 20

  constructor(value: string) {
    // null/undefinedチェックを先に行う
    if (value === null || value === undefined) {
      throw new RequiredFieldException('カテゴリー名')
    }
    const trimmedValue = value.trim()
    super(trimmedValue)
  }

  protected validate(value: string): void {
    if (value.length === 0) {
      throw new RequiredFieldException('カテゴリー名')
    }
    if (value.length > CategoryName.MAX_LENGTH) {
      throw new InvalidFieldException('カテゴリー名', value, '20文字以内で入力してください')
    }
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
