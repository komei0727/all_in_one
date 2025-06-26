import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { ValidationException } from '../exceptions/validation.exception'

/**
 * 価格値オブジェクト
 * 食材の価格を表現する（円単位、小数点第2位まで対応）
 */
export class Price extends ValueObject<number> {
  private static readonly MAX_VALUE = 9999999.99

  /**
   * 価格のバリデーション
   * @param value 価格（円）
   * @throws {ValidationException} 無効な価格の場合
   */
  protected validate(value: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationException('価格は数値で入力してください')
    }

    if (value < 0) {
      throw new ValidationException('価格は0以上の値を入力してください')
    }

    if (value > Price.MAX_VALUE) {
      throw new ValidationException('価格は9999999.99以下で入力してください')
    }

    // 小数点第3位以下は許可しない
    const decimalPlaces = (value.toString().split('.')[1] || '').length
    if (decimalPlaces > 2) {
      throw new ValidationException('価格は小数点第2位までで入力してください')
    }
  }

  /**
   * 価格が0円かどうか
   */
  isZero(): boolean {
    return this.value === 0
  }

  /**
   * 価格を加算
   */
  add(other: Price): Price {
    return new Price(this.value + other.getValue())
  }

  /**
   * 価格を乗算
   */
  multiply(multiplier: number): Price {
    // 乗算結果を小数点第2位で丸める
    const result = Math.round(this.value * multiplier * 100) / 100
    return new Price(result)
  }

  /**
   * 通貨フォーマットされた文字列を返す
   */
  toString(): string {
    // 整数部分にカンマを追加
    const formatter = new Intl.NumberFormat('ja-JP', {
      minimumFractionDigits: this.value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
    // 手動で半角円記号を追加
    return `¥${formatter.format(this.value)}`
  }

  /**
   * プレーンオブジェクト（数値）に変換
   */
  toObject(): number {
    return this.value
  }

  /**
   * プレーンオブジェクトから作成
   */
  static fromObject(value: number | null | undefined): Price | null {
    if (value === null || value === undefined) {
      return null
    }
    return new Price(value)
  }
}
