import { describe, expect, it } from 'vitest'

import { Quantity } from '@/modules/ingredients/server/domain/value-objects'

describe('Quantity', () => {
  describe('constructor', () => {
    it('有効な数量で作成できる', () => {
      // Arrange
      const validQuantity = 3.5

      // Act
      const quantity = new Quantity(validQuantity)

      // Assert
      expect(quantity.getValue()).toBe(validQuantity)
    })

    it('整数値で作成できる', () => {
      // Arrange
      const validQuantity = 10

      // Act
      const quantity = new Quantity(validQuantity)

      // Assert
      expect(quantity.getValue()).toBe(10)
    })

    it('小数点以下2桁までの値で作成できる', () => {
      // Arrange
      const validQuantity = 1.99

      // Act
      const quantity = new Quantity(validQuantity)

      // Assert
      expect(quantity.getValue()).toBe(1.99)
    })

    it('小数点以下3桁以上の値は2桁に丸められる', () => {
      // Arrange
      const quantityWithManyDecimals = 1.999

      // Act
      const quantity = new Quantity(quantityWithManyDecimals)

      // Assert
      expect(quantity.getValue()).toBe(2)
    })

    it('0の場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Quantity(0)).toThrow('数量は0より大きい値を入力してください')
    })

    it('負の値の場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Quantity(-1)).toThrow('数量は0より大きい値を入力してください')
    })

    it('最大値（9999.99）で作成できる', () => {
      // Arrange
      const maxQuantity = 9999.99

      // Act
      const quantity = new Quantity(maxQuantity)

      // Assert
      expect(quantity.getValue()).toBe(maxQuantity)
    })

    it('最大値を超える場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new Quantity(10000)).toThrow('数量は9999.99以下で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const quantity1 = new Quantity(3.5)
      const quantity2 = new Quantity(3.5)

      // Act & Assert
      expect(quantity1.equals(quantity2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const quantity1 = new Quantity(3.5)
      const quantity2 = new Quantity(4.5)

      // Act & Assert
      expect(quantity1.equals(quantity2)).toBe(false)
    })
  })

  describe('add', () => {
    it('数量を加算できる', () => {
      // Arrange
      const quantity1 = new Quantity(3.5)
      const quantity2 = new Quantity(2.5)

      // Act
      const result = quantity1.add(quantity2)

      // Assert
      expect(result.getValue()).toBe(6)
    })

    it('加算結果が最大値を超える場合エラーをスローする', () => {
      // Arrange
      const quantity1 = new Quantity(9000)
      const quantity2 = new Quantity(1000.01)

      // Act & Assert
      expect(() => quantity1.add(quantity2)).toThrow('数量は9999.99以下で入力してください')
    })
  })

  describe('subtract', () => {
    it('数量を減算できる', () => {
      // Arrange
      const quantity1 = new Quantity(5.5)
      const quantity2 = new Quantity(2.5)

      // Act
      const result = quantity1.subtract(quantity2)

      // Assert
      expect(result.getValue()).toBe(3)
    })

    it('減算結果が0以下になる場合エラーをスローする', () => {
      // Arrange
      const quantity1 = new Quantity(2)
      const quantity2 = new Quantity(3)

      // Act & Assert
      expect(() => quantity1.subtract(quantity2)).toThrow('数量は0より大きい値を入力してください')
    })
  })
})
