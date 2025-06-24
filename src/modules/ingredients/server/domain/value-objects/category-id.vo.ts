import { createId } from '@paralleldrive/cuid2'

import { ValueObject } from './value-object.base'
import { ValidationException } from '../exceptions/validation.exception'

/**
 * カテゴリーID値オブジェクト
 *
 * カテゴリーの識別子を表す値オブジェクト
 * CUID形式の識別子を使用
 */
export class CategoryId extends ValueObject<string> {
  /**
   * ID形式のバリデーション
   * @param value ID文字列
   * @throws {ValidationException} 無効なID形式の場合
   */
  protected validate(value: string): void {
    // 空文字チェック
    if (!value || value.trim() === '') {
      throw new ValidationException('カテゴリーIDは必須です')
    }

    // ID形式: 8文字以上の英数字とハイフンを許可
    const idRegex = /^[a-zA-Z0-9\-_]{8,}$/
    if (!idRegex.test(value)) {
      throw new ValidationException(
        'カテゴリーIDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
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

  /**
   * 新しいカテゴリーIDを生成
   * @returns 新しいカテゴリーID
   */
  static generate(): CategoryId {
    return new CategoryId(createId())
  }
}
