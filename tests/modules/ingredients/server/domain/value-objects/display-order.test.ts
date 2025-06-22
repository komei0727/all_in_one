import { describe, it, expect } from 'vitest'

import { InvalidFieldException } from '@/modules/ingredients/server/domain/exceptions/validation.exception'
import { DisplayOrder } from '@/modules/ingredients/server/domain/value-objects/display-order.vo'

/**
 * DisplayOrder値オブジェクトのテスト
 *
 * テスト対象:
 * - 正常な値の受け入れ
 * - 負の値の拒否
 * - デフォルト値
 * - 等価性判定
 * - 比較操作
 */
describe('DisplayOrder', () => {
  describe('constructor', () => {
    it('should create with valid number', () => {
      // Arrange & Act
      const order = new DisplayOrder(10)

      // Assert
      expect(order.getValue()).toBe(10)
    })

    it('should create with zero', () => {
      // Arrange & Act
      const order = new DisplayOrder(0)

      // Assert
      expect(order.getValue()).toBe(0)
    })

    it('should throw error for negative number', () => {
      // Arrange & Act & Assert
      expect(() => new DisplayOrder(-1)).toThrow(InvalidFieldException)
    })

    it('should throw error for decimal number', () => {
      // Arrange & Act & Assert
      expect(() => new DisplayOrder(1.5)).toThrow(InvalidFieldException)
    })
  })

  describe('default', () => {
    it('should create default order with value 0', () => {
      // Arrange & Act
      const order = DisplayOrder.default()

      // Assert
      expect(order.getValue()).toBe(0)
    })
  })

  describe('equals', () => {
    it('should return true for same values', () => {
      // Arrange
      const order1 = new DisplayOrder(10)
      const order2 = new DisplayOrder(10)

      // Act & Assert
      expect(order1.equals(order2)).toBe(true)
    })

    it('should return false for different values', () => {
      // Arrange
      const order1 = new DisplayOrder(10)
      const order2 = new DisplayOrder(20)

      // Act & Assert
      expect(order1.equals(order2)).toBe(false)
    })
  })

  describe('isLessThan', () => {
    it('should return true when value is less than other', () => {
      // Arrange
      const order1 = new DisplayOrder(10)
      const order2 = new DisplayOrder(20)

      // Act & Assert
      expect(order1.isLessThan(order2)).toBe(true)
    })

    it('should return false when value is greater than other', () => {
      // Arrange
      const order1 = new DisplayOrder(20)
      const order2 = new DisplayOrder(10)

      // Act & Assert
      expect(order1.isLessThan(order2)).toBe(false)
    })

    it('should return false when values are equal', () => {
      // Arrange
      const order1 = new DisplayOrder(10)
      const order2 = new DisplayOrder(10)

      // Act & Assert
      expect(order1.isLessThan(order2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return string representation', () => {
      // Arrange
      const order = new DisplayOrder(42)

      // Act & Assert
      expect(order.toString()).toBe('42')
    })
  })
})
