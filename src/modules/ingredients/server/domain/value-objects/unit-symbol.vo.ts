import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'
import { RequiredFieldException, InvalidFieldException } from '../exceptions'

/**
 * 単位記号値オブジェクト
 *
 * 単位の記号を表す値オブジェクト（例："g", "kg", "個"）
 * ビジネスルール:
 * - 必須（空文字不可）
 * - 最大10文字
 * - 前後の空白は自動的にトリミング
 */
export class UnitSymbol extends ValueObject<string> {
  private static readonly MAX_LENGTH = 10

  constructor(value: string) {
    const trimmedValue = value.trim()
    super(trimmedValue)
  }

  protected validate(value: string): void {
    if (value.length === 0) {
      throw new RequiredFieldException('単位記号')
    }
    if (value.length > UnitSymbol.MAX_LENGTH) {
      throw new InvalidFieldException(
        '単位記号',
        value,
        `${UnitSymbol.MAX_LENGTH}文字以内で入力してください`
      )
    }
  }

  /**
   * 新しいUnitSymbolインスタンスを生成
   *
   * @param value 単位記号
   * @returns UnitSymbolインスタンス
   */
  static create(value: string): UnitSymbol {
    return new UnitSymbol(value)
  }
}
