import { describe, it, expect } from 'vitest'

import { UnitSymbol } from '@/modules/ingredients/server/domain/value-objects/unit-symbol'

/**
 * UnitSymbol値オブジェクトのテスト
 *
 * テスト対象:
 * - 正常な値の受け入れ
 * - 空文字列の拒否
 * - 文字数制限（10文字）
 * - トリミング処理
 * - 等価性判定
 */
describe('UnitSymbol', () => {
  describe('constructor', () => {
    it('should create with valid symbol', () => {
      // Arrange & Act
      const symbol = new UnitSymbol('g')

      // Assert
      expect(symbol.getValue()).toBe('g')
    })

    it('should trim whitespace', () => {
      // Arrange & Act
      const symbol = new UnitSymbol('  kg  ')

      // Assert
      expect(symbol.getValue()).toBe('kg')
    })

    it('should throw error for empty string', () => {
      // Arrange & Act & Assert
      expect(() => new UnitSymbol('')).toThrow('単位記号は必須です')
    })

    it('should throw error for whitespace only string', () => {
      // Arrange & Act & Assert
      expect(() => new UnitSymbol('   ')).toThrow('単位記号は必須です')
    })

    it('should throw error for symbol exceeding 10 characters', () => {
      // Arrange
      const longSymbol = 'a'.repeat(11)

      // Act & Assert
      expect(() => new UnitSymbol(longSymbol)).toThrow('単位記号は10文字以内で入力してください')
    })

    it('should accept symbol with exactly 10 characters', () => {
      // Arrange
      const maxLengthSymbol = 'a'.repeat(10)

      // Act
      const symbol = new UnitSymbol(maxLengthSymbol)

      // Assert
      expect(symbol.getValue()).toBe(maxLengthSymbol)
    })

    it('should accept Japanese characters', () => {
      // Arrange & Act
      const symbol = new UnitSymbol('個')

      // Assert
      expect(symbol.getValue()).toBe('個')
    })
  })

  describe('equals', () => {
    it('should return true for same values', () => {
      // Arrange
      const symbol1 = new UnitSymbol('g')
      const symbol2 = new UnitSymbol('g')

      // Act & Assert
      expect(symbol1.equals(symbol2)).toBe(true)
    })

    it('should return true for same values after trimming', () => {
      // Arrange
      const symbol1 = new UnitSymbol('  ml  ')
      const symbol2 = new UnitSymbol('ml')

      // Act & Assert
      expect(symbol1.equals(symbol2)).toBe(true)
    })

    it('should return false for different values', () => {
      // Arrange
      const symbol1 = new UnitSymbol('g')
      const symbol2 = new UnitSymbol('kg')

      // Act & Assert
      expect(symbol1.equals(symbol2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return string representation', () => {
      // Arrange
      const symbol = new UnitSymbol('ml')

      // Act & Assert
      expect(symbol.toString()).toBe('ml')
    })
  })
})
