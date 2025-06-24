import { CategoryName } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

/**
 * CategoryName値オブジェクトのテストデータビルダー
 */
export class CategoryNameBuilder extends BaseBuilder<{ value: string }, CategoryName> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      value: testDataHelpers.categoryName(),
    }
  }

  /**
   * カテゴリー名を設定
   */
  withValue(value: string): this {
    return this.with('value', value)
  }

  /**
   * ランダムなカテゴリー名を設定
   */
  withRandomValue(): this {
    return this.with('value', testDataHelpers.categoryName())
  }

  /**
   * 空文字を設定（エラーケース用）
   */
  withEmptyValue(): this {
    return this.with('value', '')
  }

  /**
   * 最大長のカテゴリー名を設定
   */
  withMaxLengthValue(): this {
    return this.with('value', 'あ'.repeat(20))
  }

  /**
   * 最大長を超えるカテゴリー名を設定（エラーケース用）
   */
  withTooLongValue(): this {
    return this.with('value', 'あ'.repeat(21))
  }

  build(): CategoryName {
    return new CategoryName(this.props.value!)
  }
}
