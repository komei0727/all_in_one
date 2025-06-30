import { describe, it, expect } from 'vitest'

import { InvalidFieldException } from '@/modules/ingredients/server/domain/exceptions'
import { DisplayOrder } from '@/modules/ingredients/server/domain/value-objects'
import { DisplayOrderBuilder } from '@tests/__fixtures__/builders'

describe('DisplayOrder', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効な表示順序でインスタンスを生成できる', () => {
      // Arrange & Act
      const order = new DisplayOrderBuilder().build()

      // Assert
      expect(order.getValue()).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(order.getValue())).toBe(true)
    })

    it('0を許可する', () => {
      // Arrange & Act
      const order = new DisplayOrderBuilder().withZero().build()

      // Assert
      expect(order.getValue()).toBe(0)
    })

    it('大きな整数を許可する', () => {
      // Arrange & Act
      const order = new DisplayOrderBuilder().withLargeValue().build()

      // Assert
      expect(order.getValue()).toBe(9999)
    })

    // 異常系のテスト
    it('負の数の場合はInvalidFieldExceptionをスローする', () => {
      // Arrange
      const builder = new DisplayOrderBuilder().withNegativeValue()

      // Act & Assert
      expect(() => builder.build()).toThrow(InvalidFieldException)
      expect(() => builder.build()).toThrow('0以上の整数である必要があります')
    })

    it('小数の場合はInvalidFieldExceptionをスローする', () => {
      // Arrange
      const builder = new DisplayOrderBuilder().withDecimalValue()

      // Act & Assert
      expect(() => builder.build()).toThrow(InvalidFieldException)
      expect(() => builder.build()).toThrow('整数である必要があります')
    })
  })

  describe('default', () => {
    it('デフォルト値として0を返す', () => {
      const order = DisplayOrder.default()
      expect(order.getValue()).toBe(0)
    })
  })

  describe('isLessThan', () => {
    it('小さい値の場合はtrueを返す', () => {
      // Arrange
      const order1 = new DisplayOrderBuilder().withValue(1).build()
      const order2 = new DisplayOrderBuilder().withValue(2).build()

      // Act & Assert
      expect(order1.isLessThan(order2)).toBe(true)
    })

    it('大きい値の場合はfalseを返す', () => {
      // Arrange
      const order1 = new DisplayOrderBuilder().withValue(2).build()
      const order2 = new DisplayOrderBuilder().withValue(1).build()

      // Act & Assert
      expect(order1.isLessThan(order2)).toBe(false)
    })

    it('同じ値の場合はfalseを返す', () => {
      // Arrange
      const value = new DisplayOrderBuilder().build().getValue()
      const order1 = DisplayOrder.create(value)
      const order2 = DisplayOrder.create(value)

      // Act & Assert
      expect(order1.isLessThan(order2)).toBe(false)
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const value = new DisplayOrderBuilder().build().getValue()
      const order1 = DisplayOrder.create(value)
      const order2 = DisplayOrder.create(value)

      // Act & Assert
      expect(order1.equals(order2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const order1 = new DisplayOrderBuilder().build()

      // Act & Assert
      // ランダム値が偶然同じになる可能性があるため、明示的に異なる値を設定
      const differentOrder = DisplayOrder.create(order1.getValue() + 1)
      expect(order1.equals(differentOrder)).toBe(false)
    })
  })
})
