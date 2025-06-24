import { UnitSymbol } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

/**
 * UnitSymbol値オブジェクトのテストデータビルダー
 */
export class UnitSymbolBuilder extends BaseBuilder<{ value: string }, UnitSymbol> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      value: testDataHelpers.unit().symbol,
    }
  }

  /**
   * 単位記号を設定
   */
  withValue(value: string): this {
    return this.with('value', value)
  }

  /**
   * ランダムな単位記号を設定
   */
  withRandomValue(): this {
    return this.with('value', testDataHelpers.unit().symbol)
  }

  /**
   * 空文字を設定（エラーケース用）
   */
  withEmptyValue(): this {
    return this.with('value', '')
  }

  /**
   * 最大長の単位記号を設定
   */
  withMaxLengthValue(): this {
    return this.with('value', 'a'.repeat(10))
  }

  /**
   * 最大長を超える単位記号を設定（エラーケース用）
   */
  withTooLongValue(): this {
    return this.with('value', 'a'.repeat(11))
  }

  /**
   * 前後に空白を含む文字列を設定
   */
  withSpaces(): this {
    const symbol = testDataHelpers.unit().symbol
    return this.with('value', `  ${symbol}  `)
  }

  /**
   * 空白のみを設定（エラーケース用）
   */
  withOnlySpaces(): this {
    return this.with('value', '   ')
  }

  /**
   * グラムを設定
   */
  withGram(): this {
    return this.with('value', 'g')
  }

  /**
   * キログラムを設定
   */
  withKilogram(): this {
    return this.with('value', 'kg')
  }

  /**
   * 個を設定
   */
  withPiece(): this {
    return this.with('value', '個')
  }

  build(): UnitSymbol {
    return new UnitSymbol(this.props.value!)
  }
}
