import { Price } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

/**
 * Price値オブジェクトのテストデータビルダー
 */
export class PriceBuilder extends BaseBuilder<{ value: number }, Price> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      value: testDataHelpers.price(),
    }
  }

  /**
   * 価格を設定
   */
  withValue(value: number): this {
    return this.with('value', value)
  }

  /**
   * ランダムな価格を設定
   */
  withRandomValue(): this {
    return this.with('value', testDataHelpers.price())
  }

  /**
   * ゼロ円を設定
   */
  withZero(): this {
    return this.with('value', 0)
  }

  /**
   * 負の値を設定（エラーケース用）
   */
  withNegativeValue(): this {
    return this.with('value', -100)
  }

  /**
   * 最大値を設定
   */
  withMaxValue(): this {
    return this.with('value', 9999999.99)
  }

  /**
   * 最大値を超える値を設定（エラーケース用）
   */
  withTooLargeValue(): this {
    return this.with('value', 10000000)
  }

  /**
   * 小数点第1位の値を設定
   */
  withOneDecimalPlace(): this {
    return this.with('value', testDataHelpers.price() / 10)
  }

  /**
   * 小数点第2位の値を設定
   */
  withTwoDecimalPlaces(): this {
    return this.with('value', Math.round(testDataHelpers.price() * 0.99) / 100)
  }

  /**
   * 小数点第3位以下の値を設定（エラーケース用）
   */
  withTooManyDecimalPlaces(): this {
    return this.with('value', 100.555)
  }

  build(): Price {
    return new Price(this.props.value!)
  }
}
