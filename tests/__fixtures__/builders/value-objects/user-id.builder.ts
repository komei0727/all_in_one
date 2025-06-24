import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

/**
 * UserIdビルダー
 * ユーザーID値オブジェクトのテストデータを生成
 */
export class UserIdBuilder extends BaseBuilder<{ value: string }> {
  constructor() {
    super()
    // デフォルト値を設定（Faker.jsでランダムなCUID生成）
    this.props.value = testDataHelpers.cuid()
  }

  /**
   * 指定したIDでビルド
   */
  withValue(value: string): this {
    return this.with('value', value)
  }

  /**
   * 固定値のユーザーIDでビルド（テスト用）
   */
  withTestId(): this {
    return this.with('value', 'user_test_001')
  }

  /**
   * プレフィックス付きでビルド
   */
  withPrefix(prefix: string): this {
    return this.with('value', `${prefix}_${testDataHelpers.cuid()}`)
  }

  build() {
    return {
      value: this.props.value!
    }
  }
}