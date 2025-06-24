import { DisplayOrder } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { faker } from '../faker.config'

/**
 * DisplayOrder値オブジェクトのテストデータビルダー
 */
export class DisplayOrderBuilder extends BaseBuilder<{ value: number }, DisplayOrder> {
  constructor() {
    super()
    // デフォルト値を設定（1〜999のランダムな整数）
    this.props = {
      value: faker.number.int({ min: 1, max: 999 }),
    }
  }

  /**
   * 表示順を設定
   */
  withValue(value: number): this {
    return this.with('value', value)
  }

  /**
   * ランダムな表示順を設定
   */
  withRandomValue(): this {
    return this.with('value', faker.number.int({ min: 0, max: 9999 }))
  }

  /**
   * ゼロを設定
   */
  withZero(): this {
    return this.with('value', 0)
  }

  /**
   * 最小値（0）を設定
   */
  withMinValue(): this {
    return this.with('value', 0)
  }

  /**
   * 大きな値を設定
   */
  withLargeValue(): this {
    return this.with('value', 9999)
  }

  /**
   * 負の値を設定（エラーケース用）
   */
  withNegativeValue(): this {
    return this.with('value', -1)
  }

  /**
   * 小数を設定（エラーケース用）
   */
  withDecimalValue(): this {
    return this.with('value', 1.5)
  }

  build(): DisplayOrder {
    return DisplayOrder.create(this.props.value!)
  }
}
