import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'

import { BaseBuilder } from '../base.builder'
import { faker, testDataHelpers } from '../faker.config'

interface UnitProps {
  id: string
  name: string
  symbol: string
  type: string
  displayOrder: number
}

/**
 * Unit エンティティのテストデータビルダー
 */
export class UnitBuilder extends BaseBuilder<UnitProps, Unit> {
  constructor() {
    super()
    // デフォルト値を設定
    const unit = testDataHelpers.unit()
    this.props = {
      id: testDataHelpers.unitId(),
      name: unit.name,
      symbol: unit.symbol,
      type: 'WEIGHT', // デフォルトは重量タイプ
      displayOrder: faker.number.int({ min: 1, max: 999 }),
    }
  }

  /**
   * IDを設定
   */
  withId(id: string): this {
    return this.with('id', id)
  }

  /**
   * 新規生成されたIDを設定
   */
  withGeneratedId(): this {
    return this.with('id', testDataHelpers.unitId())
  }

  /**
   * 単位名を設定
   */
  withName(name: string): this {
    return this.with('name', name)
  }

  /**
   * 単位記号を設定
   */
  withSymbol(symbol: string): this {
    return this.with('symbol', symbol)
  }

  /**
   * 単位タイプを設定
   */
  withType(type: string): this {
    return this.with('type', type)
  }

  /**
   * ランダムな単位を設定
   */
  withRandomUnit(): this {
    const unit = testDataHelpers.unit()
    return this.with('name', unit.name).with('symbol', unit.symbol)
  }

  /**
   * 表示順を設定
   */
  withDisplayOrder(order: number): this {
    return this.with('displayOrder', order)
  }

  /**
   * ランダムな表示順を設定
   */
  withRandomDisplayOrder(): this {
    return this.with('displayOrder', faker.number.int({ min: 1, max: 999 }))
  }

  /**
   * グラムとして設定
   */
  asGram(): this {
    return this.withName('グラム').withSymbol('g').withType('WEIGHT').withDisplayOrder(1)
  }

  /**
   * キログラムとして設定
   */
  asKilogram(): this {
    return this.withName('キログラム').withSymbol('kg').withType('WEIGHT').withDisplayOrder(2)
  }

  /**
   * 個として設定
   */
  asPiece(): this {
    return this.withName('個').withSymbol('個').withType('COUNT').withDisplayOrder(3)
  }

  /**
   * リットルとして設定
   */
  asLiter(): this {
    return this.withName('リットル').withSymbol('L').withType('VOLUME').withDisplayOrder(4)
  }

  /**
   * ミリリットルとして設定
   */
  asMilliliter(): this {
    return this.withName('ミリリットル').withSymbol('ml').withType('VOLUME').withDisplayOrder(5)
  }

  /**
   * グラムとして設定（互換性のためのエイリアス）
   */
  withGram(): this {
    return this.asGram()
  }

  /**
   * キログラムとして設定（互換性のためのエイリアス）
   */
  withKilogram(): this {
    return this.asKilogram()
  }

  /**
   * ミリリットルとして設定（互換性のためのエイリアス）
   */
  withMilliliter(): this {
    return this.asMilliliter()
  }

  build(): Unit {
    return new Unit(this.props as UnitProps)
  }
}

/**
 * 既存のファクトリー関数との互換性を保つためのヘルパー関数
 */
export const createTestUnit = (
  overrides?: Partial<{
    id: string
    name: string
    symbol: string
    type: string
    displayOrder: number
  }>
): Unit => {
  const builder = new UnitBuilder()

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.name) {
    builder.withName(overrides.name)
  }
  if (overrides?.symbol) {
    builder.withSymbol(overrides.symbol)
  }
  if (overrides?.type) {
    builder.withType(overrides.type)
  }
  if (overrides?.displayOrder !== undefined) {
    builder.withDisplayOrder(overrides.displayOrder)
  }

  return builder.build()
}
