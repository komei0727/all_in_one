import { createId } from '@paralleldrive/cuid2'

import { ValueObject } from './value-object.base'
import { ValidationException } from '../exceptions/validation.exception'

/**
 * 単位ID値オブジェクト
 *
 * 単位の識別子を表す値オブジェクト
 * CUID形式の識別子を使用
 */
export class UnitId extends ValueObject<string> {
  /**
   * ID形式のバリデーション
   * @param value ID文字列
   * @throws {ValidationException} 無効なID形式の場合
   */
  protected validate(value: string): void {
    // 空文字チェック
    if (!value || value.trim() === '') {
      throw new ValidationException('単位IDは必須です')
    }

    // ID形式: 8文字以上の英数字とハイフンを許可
    const idRegex = /^[a-zA-Z0-9\-_]{8,}$/
    if (!idRegex.test(value)) {
      throw new ValidationException(
        '単位IDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    }
  }

  /**
   * 新しいUnitIdインスタンスを生成
   *
   * @param value 単位IDの値
   * @returns UnitIdインスタンス
   */
  static create(value: string): UnitId {
    return new UnitId(value)
  }

  /**
   * 新しい単位IDを生成
   * @returns 新しい単位ID
   */
  static generate(): UnitId {
    return new UnitId(createId())
  }
}
