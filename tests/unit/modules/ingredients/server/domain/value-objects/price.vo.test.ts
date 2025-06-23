import { describe, expect, it } from 'vitest'

import { Price } from '@/modules/ingredients/server/domain/value-objects'

import { PriceBuilder } from '../../../../../../__fixtures__/builders'

describe('Price', () => {
  describe('constructor', () => {
    it('有効な価格で作成できる', () => {
      // Arrange & Act
      const price = new PriceBuilder().build()

      // Assert
      expect(price.getValue()).toBeGreaterThanOrEqual(10)
      expect(price.getValue()).toBeLessThanOrEqual(5000)
    })

    it('0円で作成できる', () => {
      // Arrange & Act
      const price = new PriceBuilder().withZero().build()

      // Assert
      expect(price.getValue()).toBe(0)
    })

    it('最大値（9999999.99）で作成できる', () => {
      // Arrange & Act
      const price = new PriceBuilder().withMaxValue().build()

      // Assert
      expect(price.getValue()).toBe(9999999.99)
    })

    it('小数点第2位まで作成できる', () => {
      // Arrange & Act
      const price = new PriceBuilder().withTwoDecimalPlaces().build()

      // Assert
      const decimalPlaces = price.getValue().toString().split('.')[1]?.length || 0
      expect(decimalPlaces).toBeLessThanOrEqual(2)
    })

    it('小数点第1位の値で作成できる', () => {
      // Arrange & Act
      const price = new PriceBuilder().withOneDecimalPlace().build()

      // Assert
      const decimalPlaces = price.getValue().toString().split('.')[1]?.length || 0
      expect(decimalPlaces).toBeLessThanOrEqual(1)
    })

    it('負の値の場合エラーをスローする', () => {
      // Arrange
      const builder = new PriceBuilder().withNegativeValue()

      // Act & Assert
      expect(() => builder.build()).toThrow('価格は0以上の値を入力してください')
    })

    it('最大値を超える場合エラーをスローする', () => {
      // Arrange
      const builder = new PriceBuilder().withTooLargeValue()

      // Act & Assert
      expect(() => builder.build()).toThrow('価格は9999999.99以下で入力してください')
    })

    it('小数点第3位以下の場合エラーをスローする', () => {
      // Arrange
      const builder = new PriceBuilder().withTooManyDecimalPlaces()

      // Act & Assert
      expect(() => builder.build()).toThrow('価格は小数点第2位までで入力してください')
    })

    it('NaNの場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Price(NaN)).toThrow('価格は数値で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const builder = new PriceBuilder()
      const price1 = builder.build()
      const price2 = new Price(price1.getValue())

      // Act & Assert
      expect(price1.equals(price2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const price1 = new PriceBuilder().build()

      // Act & Assert
      // ランダム値が偶然同じになる可能性があるため、明示的に異なる値を設定
      const differentPrice = new Price(price1.getValue() + 100)
      expect(price1.equals(differentPrice)).toBe(false)
    })
  })
})
