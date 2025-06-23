import { IngredientName } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

/**
 * IngredientName値オブジェクトのテストデータビルダー
 */
export class IngredientNameBuilder extends BaseBuilder<{ value: string }, IngredientName> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      value: testDataHelpers.ingredientName(),
    }
  }

  /**
   * 食材名を設定
   */
  withValue(value: string): this {
    return this.with('value', value)
  }

  /**
   * ランダムな食材名を設定
   */
  withRandomValue(): this {
    return this.with('value', testDataHelpers.ingredientName())
  }

  /**
   * 空文字を設定（エラーケース用）
   */
  withEmptyValue(): this {
    return this.with('value', '')
  }

  /**
   * 最大長の食材名を設定
   */
  withMaxLengthValue(): this {
    return this.with('value', 'あ'.repeat(50))
  }

  /**
   * 最大長を超える食材名を設定（エラーケース用）
   */
  withTooLongValue(): this {
    return this.with('value', 'あ'.repeat(51))
  }

  build(): IngredientName {
    return new IngredientName(this.props.value!)
  }
}
