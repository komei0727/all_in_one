import { Memo } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { faker } from '../faker.config'

/**
 * Memo値オブジェクトのテストデータビルダー
 */
export class MemoBuilder extends BaseBuilder<{ value?: string }, Memo> {
  constructor() {
    super()
    // デフォルト値を設定（短いメモ）
    this.props = {
      value: faker.lorem.sentence({ min: 3, max: 10 }),
    }
  }

  /**
   * メモを設定
   */
  withValue(value?: string): this {
    return this.with('value', value)
  }

  /**
   * ランダムなメモを設定
   */
  withRandomValue(): this {
    return this.with('value', faker.lorem.sentence({ min: 3, max: 10 }))
  }

  /**
   * 長いメモを設定
   */
  withLongValue(): this {
    return this.with('value', faker.lorem.paragraph())
  }

  /**
   * 空のメモを設定
   */
  withEmptyValue(): this {
    return this.with('value', undefined)
  }

  /**
   * 最大長のメモを設定
   */
  withMaxLengthValue(): this {
    return this.with('value', 'あ'.repeat(200))
  }

  /**
   * 最大長を超えるメモを設定（エラーケース用）
   */
  withTooLongValue(): this {
    return this.with('value', 'あ'.repeat(201))
  }

  /**
   * 前後に空白を含むメモを設定
   */
  withSpaces(): this {
    const content = faker.lorem.sentence({ min: 3, max: 10 })
    return this.with('value', `  ${content}  `)
  }

  build(): Memo {
    // Memoはnullを受け付けないため、空文字列を使用
    return new Memo(this.props.value ?? '')
  }
}
