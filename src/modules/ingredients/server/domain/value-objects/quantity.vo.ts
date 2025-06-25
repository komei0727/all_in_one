import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { ValidationException } from '../exceptions/validation.exception'

/**
 * 数量値オブジェクト
 * 食材の数量を表現する
 */
export class Quantity extends ValueObject<number> {
  private static readonly MAX_VALUE = 9999.99

  constructor(value: number) {
    // 小数点以下2桁に丸める
    const roundedValue = Math.round(value * 100) / 100
    super(roundedValue)
  }

  /**
   * 数量のバリデーション
   * @param value 数量
   * @throws {ValidationException} 無効な数量の場合
   */
  protected validate(value: number): void {
    if (value <= 0) {
      throw new ValidationException('数量は0より大きい値を入力してください')
    }

    if (value > Quantity.MAX_VALUE) {
      throw new ValidationException('数量は9999.99以下で入力してください')
    }
  }

  /**
   * 数量を加算
   * @param other 加算する数量
   * @returns 加算結果の数量
   */
  add(other: Quantity): Quantity {
    return new Quantity(this.value + other.getValue())
  }

  /**
   * 数量を減算
   * @param other 減算する数量
   * @returns 減算結果の数量
   */
  subtract(other: Quantity): Quantity {
    return new Quantity(this.value - other.getValue())
  }
}
