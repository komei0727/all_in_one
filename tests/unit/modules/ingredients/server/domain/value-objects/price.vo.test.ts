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

  describe('ビジネスメソッド', () => {
    it('isZero()が正しく動作する', () => {
      // Arrange
      const zeroPrice = new PriceBuilder().withZero().build()
      const nonZeroPrice = new PriceBuilder().withValue(100).build()

      // Act & Assert
      expect(zeroPrice.isZero()).toBe(true)
      expect(nonZeroPrice.isZero()).toBe(false)
    })

    it('toString()で通貨フォーマットされた文字列を返す', () => {
      // Arrange
      const price1 = new PriceBuilder().withValue(1234).build()
      const price2 = new PriceBuilder().withValue(1234.5).build()
      const price3 = new PriceBuilder().withValue(1234.56).build()
      const price4 = new PriceBuilder().withValue(1234567).build()

      // Act & Assert
      expect(price1.toString()).toBe('¥1,234')
      expect(price2.toString()).toBe('¥1,234.50')
      expect(price3.toString()).toBe('¥1,234.56')
      expect(price4.toString()).toBe('¥1,234,567')
    })

    it('add()で価格を加算できる', () => {
      // Arrange
      const price1 = new PriceBuilder().withValue(100).build()
      const price2 = new PriceBuilder().withValue(50.5).build()

      // Act
      const result = price1.add(price2)

      // Assert
      expect(result.getValue()).toBe(150.5)
    })

    it('multiply()で価格を乗算できる', () => {
      // Arrange
      const price = new PriceBuilder().withValue(100).build()

      // Act
      const result = price.multiply(3)

      // Assert
      expect(result.getValue()).toBe(300)
    })

    it('multiply()で小数の乗算もできる', () => {
      // Arrange
      const price = new PriceBuilder().withValue(100).build()

      // Act
      const result = price.multiply(1.5)

      // Assert
      expect(result.getValue()).toBe(150)
    })
  })

  describe('toObject/fromObject', () => {
    it('toObject()で数値に変換できる', () => {
      // Arrange
      const price = new PriceBuilder().withValue(198.5).build()

      // Act
      const obj = price.toObject()

      // Assert
      expect(obj).toBe(198.5)
    })

    it('fromObject()で数値からPriceを作成できる', () => {
      // Arrange
      const value = 198

      // Act
      const price = Price.fromObject(value)

      // Assert
      expect(price).not.toBeNull()
      expect(price?.getValue()).toBe(198)
    })

    it('fromObject()でnullからnullを返す', () => {
      // Act
      const price = Price.fromObject(null)

      // Assert
      expect(price).toBeNull()
    })

    it('fromObject()でundefinedからnullを返す', () => {
      // Act
      const price = Price.fromObject(undefined)

      // Assert
      expect(price).toBeNull()
    })
  })
})
