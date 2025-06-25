import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { RequiredFieldException, InvalidFieldException } from '../exceptions'

/**
 * 単位名値オブジェクト
 *
 * 単位の名称を表す値オブジェクト
 * ビジネスルール:
 * - 必須（空文字不可）
 * - 最大30文字
 * - 前後の空白は自動的にトリミング
 */
export class UnitName extends ValueObject<string> {
  private static readonly MAX_LENGTH = 30

  constructor(value: string) {
    const trimmedValue = value.trim()
    super(trimmedValue)
  }

  protected validate(value: string): void {
    if (value.length === 0) {
      throw new RequiredFieldException('単位名')
    }
    if (value.length > UnitName.MAX_LENGTH) {
      throw new InvalidFieldException(
        '単位名',
        value,
        `${UnitName.MAX_LENGTH}文字以内で入力してください`
      )
    }
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
