import { describe, expect, it } from 'vitest'

import { Quantity } from '@/modules/ingredients/server/domain/value-objects'
import { QuantityBuilder } from '@tests/__fixtures__/builders'

describe('Quantity', () => {
  describe('constructor', () => {
    it('有効な数量で作成できる', () => {
      // Arrange & Act
      const quantity = new QuantityBuilder().build()

      // Assert
      expect(quantity.getValue()).toBeGreaterThan(0)
      expect(quantity.getValue()).toBeLessThanOrEqual(100)
    })

    it('整数値で作成できる', () => {
      // Arrange & Act
      // 1から100の間のランダムな整数を生成（0を避ける）
      const integerValue = Math.floor(Math.random() * 100) + 1
      const quantity = new Quantity(integerValue)

      // Assert
      expect(Number.isInteger(quantity.getValue())).toBe(true)
    })

    it('小数点以下2桁までの値で作成できる', () => {
      // Arrange & Act
      const quantity = new QuantityBuilder().withTwoDecimalPlaces().build()

      // Assert
      const decimalPlaces = quantity.getValue().toString().split('.')[1]?.length || 0
      expect(decimalPlaces).toBeLessThanOrEqual(2)
    })

    it('小数点以下3桁以上の値は2桁に丸められる', () => {
      // Arrange
      const builder = new QuantityBuilder().withTooManyDecimalPlaces()

      // Act
      const quantity = builder.build()

      // Assert
      expect(quantity.getValue()).toBe(2)
    })

    it('0の場合エラーをスローする', () => {
      // Arrange
      const builder = new QuantityBuilder().withZero()

      // Act & Assert
      expect(() => builder.build()).toThrow('数量は0より大きい値を入力してください')
    })

    it('負の値の場合エラーをスローする', () => {
      // Arrange
      const builder = new QuantityBuilder().withNegativeValue()

      // Act & Assert
      expect(() => builder.build()).toThrow('数量は0より大きい値を入力してください')
    })

    it('最大値（9999.99）で作成できる', () => {
      // Arrange & Act
      const quantity = new QuantityBuilder().withMaxValue().build()

      // Assert
      expect(quantity.getValue()).toBe(9999.99)
    })

    it('最大値を超える場合エラーをスローする', () => {
      // Arrange
      const builder = new QuantityBuilder().withTooLargeValue()

      // Act & Assert
      expect(() => builder.build()).toThrow('数量は9999.99以下で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const builder = new QuantityBuilder()
      const quantity1 = builder.build()
      const quantity2 = new Quantity(quantity1.getValue())

      // Act & Assert
      expect(quantity1.equals(quantity2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const quantity1 = new QuantityBuilder().build()

      // Act & Assert
      // ランダム値が偶然同じになる可能性があるため、明示的に異なる値を設定
      const differentQuantity = new Quantity(quantity1.getValue() + 1)
      expect(quantity1.equals(differentQuantity)).toBe(false)
    })
  })

  describe('add', () => {
    it('数量を加算できる', () => {
      // Arrange
      const quantity1 = new QuantityBuilder().withValue(3.5).build()
      const quantity2 = new QuantityBuilder().withValue(2.5).build()

      // Act
      const result = quantity1.add(quantity2)

      // Assert
      expect(result.getValue()).toBe(6)
    })

    it('加算結果が最大値を超える場合エラーをスローする', () => {
      // Arrange
      const quantity1 = new QuantityBuilder().withValue(9000).build()
      const quantity2 = new QuantityBuilder().withValue(1000.01).build()

      // Act & Assert
      expect(() => quantity1.add(quantity2)).toThrow('数量は9999.99以下で入力してください')
    })
  })

  describe('subtract', () => {
    it('数量を減算できる', () => {
      // Arrange
      const quantity1 = new QuantityBuilder().withValue(5.5).build()
      const quantity2 = new QuantityBuilder().withValue(2.5).build()

      // Act
      const result = quantity1.subtract(quantity2)

      // Assert
      expect(result.getValue()).toBe(3)
    })

    it('減算結果が0以下になる場合エラーをスローする', () => {
      // Arrange
      const quantity1 = new QuantityBuilder().withValue(2).build()
      const quantity2 = new QuantityBuilder().withValue(3).build()

      // Act & Assert
      expect(() => quantity1.subtract(quantity2)).toThrow('数量は0より大きい値を入力してください')
    })
  })
})
