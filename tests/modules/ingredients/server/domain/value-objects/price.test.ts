import { describe, expect, it } from 'vitest'

import { Price } from '@/modules/ingredients/server/domain/value-objects'

describe('Price', () => {
  describe('constructor', () => {
    it('有効な価格で作成できる', () => {
      // Arrange
      const validPrice = 300

      // Act
      const price = new Price(validPrice)

      // Assert
      expect(price.getValue()).toBe(validPrice)
    })

    it('0円で作成できる', () => {
      // Arrange
      const zeroPrice = 0

      // Act
      const price = new Price(zeroPrice)

      // Assert
      expect(price.getValue()).toBe(0)
    })

    it('最大値（9999999.99）で作成できる', () => {
      // Arrange
      const maxPrice = 9999999.99

      // Act
      const price = new Price(maxPrice)

      // Assert
      expect(price.getValue()).toBe(maxPrice)
    })

    it('小数点第2位まで作成できる', () => {
      // Arrange
      const priceWithDecimals = 198.5

      // Act
      const price = new Price(priceWithDecimals)

      // Assert
      expect(price.getValue()).toBe(priceWithDecimals)
    })

    it('小数点第1位の値で作成できる', () => {
      // Arrange
      const priceWithOneDecimal = 100.5

      // Act
      const price = new Price(priceWithOneDecimal)

      // Assert
      expect(price.getValue()).toBe(priceWithOneDecimal)
    })

    it('負の値の場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Price(-1)).toThrow('価格は0以上の値を入力してください')
    })

    it('最大値を超える場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Price(10000000)).toThrow('価格は9999999.99以下で入力してください')
    })

    it('小数点第3位以下の場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Price(100.555)).toThrow('価格は小数点第2位までで入力してください')
    })

    it('NaNの場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Price(NaN)).toThrow('価格は数値で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const price1 = new Price(300)
      const price2 = new Price(300)

      // Act & Assert
      expect(price1.equals(price2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const price1 = new Price(300)
      const price2 = new Price(400)

      // Act & Assert
      expect(price1.equals(price2)).toBe(false)
    })
  })
})
