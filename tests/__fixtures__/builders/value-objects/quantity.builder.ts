import { Quantity } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

/**
 * Quantity値オブジェクトのテストデータビルダー
 */
export class QuantityBuilder extends BaseBuilder<{ value: number }, Quantity> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      value: testDataHelpers.quantity(),
    }
  }

  /**
   * 数量を設定
   */
  withValue(value: number): this {
    return this.with('value', value)
  }

  /**
   * ランダムな数量を設定
   */
  withRandomValue(): this {
    return this.with('value', testDataHelpers.quantity())
  }

  /**
   * ゼロを設定
   */
  withZero(): this {
    return this.with('value', 0)
  }

  /**
   * 負の値を設定（エラーケース用）
   */
  withNegativeValue(): this {
    return this.with('value', -1)
  }

  /**
   * 最大値を設定
   */
  withMaxValue(): this {
    return this.with('value', 9999.99)
  }

  /**
   * 最大値を超える値を設定（エラーケース用）
   */
  withTooLargeValue(): this {
    return this.with('value', 10000)
  }

  /**
   * 小数点第1位の値を設定
   */
  withOneDecimalPlace(): this {
    const value = Math.round(testDataHelpers.quantity() * 10) / 10
    return this.with('value', value)
  }

  /**
   * 小数点第2位の値を設定
   */
  withTwoDecimalPlaces(): this {
    const value = Math.round(testDataHelpers.quantity() * 100) / 100
    return this.with('value', value)
  }

  /**
   * 小数点第3位以下の値を設定（エラーケース用）
   */
  withTooManyDecimalPlaces(): this {
    return this.with('value', 1.999)
  }

  build(): Quantity {
    return new Quantity(this.props.value!)
  }
}
