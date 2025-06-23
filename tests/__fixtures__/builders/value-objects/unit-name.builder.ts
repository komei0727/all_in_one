import { UnitName } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

/**
 * UnitName値オブジェクトのテストデータビルダー
 */
export class UnitNameBuilder extends BaseBuilder<{ value: string }, UnitName> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      value: testDataHelpers.unit().name,
    }
  }

  /**
   * 単位名を設定
   */
  withValue(value: string): this {
    return this.with('value', value)
  }

  /**
   * ランダムな単位名を設定
   */
  withRandomValue(): this {
    return this.with('value', testDataHelpers.unit().name)
  }

  /**
   * 空文字を設定（エラーケース用）
   */
  withEmptyValue(): this {
    return this.with('value', '')
  }

  /**
   * 最大長の単位名を設定
   */
  withMaxLengthValue(): this {
    return this.with('value', 'あ'.repeat(30))
  }

  /**
   * 最大長を超える単位名を設定（エラーケース用）
   */
  withTooLongValue(): this {
    return this.with('value', 'あ'.repeat(31))
  }

  /**
   * 空白のみの値を設定（エラーケース用）
   */
  withWhitespaceOnlyValue(): this {
    return this.with('value', '   ')
  }

  /**
   * 前後に空白を含む値を設定
   */
  withWhitespaceWrappedValue(value?: string): this {
    const baseValue = value || testDataHelpers.unit().name
    return this.with('value', `  ${baseValue}  `)
  }

  build(): UnitName {
    return UnitName.create(this.props.value!)
  }
}
