import { describe, it, expect } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/ingredients/server/domain/exceptions/validation.exception'
import { UnitName } from '@/modules/ingredients/server/domain/value-objects/unit-name.vo'

/**
 * UnitName値オブジェクトのテスト
 *
 * テスト対象:
 * - 正常な値の受け入れ
 * - 空文字列の拒否
 * - 文字数制限（30文字）
 * - トリミング処理
 * - 等価性判定
 */
describe('UnitName', () => {
  describe('constructor', () => {
    it('should create with valid name', () => {
      // Arrange & Act
      const name = new UnitName('グラム')

      // Assert
      expect(name.getValue()).toBe('グラム')
    })

    it('should trim whitespace', () => {
      // Arrange & Act
      const name = new UnitName('  キログラム  ')

      // Assert
      expect(name.getValue()).toBe('キログラム')
    })

    it('should throw error for empty string', () => {
      // Arrange & Act & Assert
      expect(() => new UnitName('')).toThrow(RequiredFieldException)
    })

    it('should throw error for whitespace only string', () => {
      // Arrange & Act & Assert
      expect(() => new UnitName('   ')).toThrow(RequiredFieldException)
    })

    it('should throw error for name exceeding 30 characters', () => {
      // Arrange
      const longName = 'あ'.repeat(31)

      // Act & Assert
      expect(() => new UnitName(longName)).toThrow(InvalidFieldException)
    })

    it('should accept name with exactly 30 characters', () => {
      // Arrange
      const maxLengthName = 'あ'.repeat(30)

      // Act
      const name = new UnitName(maxLengthName)

      // Assert
      expect(name.getValue()).toBe(maxLengthName)
    })
  })

  describe('equals', () => {
    it('should return true for same values', () => {
      // Arrange
      const name1 = new UnitName('グラム')
      const name2 = new UnitName('グラム')

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('should return true for same values after trimming', () => {
      // Arrange
      const name1 = new UnitName('  グラム  ')
      const name2 = new UnitName('グラム')

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('should return false for different values', () => {
      // Arrange
      const name1 = new UnitName('グラム')
      const name2 = new UnitName('キログラム')

      // Act & Assert
      expect(name1.equals(name2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return string representation', () => {
      // Arrange
      const name = new UnitName('ミリリットル')

      // Act & Assert
      expect(name.toString()).toBe('ミリリットル')
    })
  })
})
