import { describe, it, expect } from 'vitest'

import { CategoryName } from '@/modules/ingredients/server/domain/value-objects/category-name'

/**
 * CategoryName値オブジェクトのテスト
 *
 * テスト対象:
 * - 正常な値の受け入れ
 * - 空文字列の拒否
 * - 文字数制限（20文字）
 * - トリミング処理
 * - 等価性判定
 */
describe('CategoryName', () => {
  describe('constructor', () => {
    it('should create with valid name', () => {
      // Arrange & Act
      const name = new CategoryName('野菜')

      // Assert
      expect(name.getValue()).toBe('野菜')
    })

    it('should trim whitespace', () => {
      // Arrange & Act
      const name = new CategoryName('  肉類  ')

      // Assert
      expect(name.getValue()).toBe('肉類')
    })

    it('should throw error for empty string', () => {
      // Arrange & Act & Assert
      expect(() => new CategoryName('')).toThrow('カテゴリー名は必須です')
    })

    it('should throw error for whitespace only string', () => {
      // Arrange & Act & Assert
      expect(() => new CategoryName('   ')).toThrow('カテゴリー名は必須です')
    })

    it('should throw error for name exceeding 20 characters', () => {
      // Arrange
      const longName = 'あ'.repeat(21)

      // Act & Assert
      expect(() => new CategoryName(longName)).toThrow('カテゴリー名は20文字以内で入力してください')
    })

    it('should accept name with exactly 20 characters', () => {
      // Arrange
      const maxLengthName = 'あ'.repeat(20)

      // Act
      const name = new CategoryName(maxLengthName)

      // Assert
      expect(name.getValue()).toBe(maxLengthName)
    })
  })

  describe('equals', () => {
    it('should return true for same values', () => {
      // Arrange
      const name1 = new CategoryName('野菜')
      const name2 = new CategoryName('野菜')

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('should return true for same values after trimming', () => {
      // Arrange
      const name1 = new CategoryName('  野菜  ')
      const name2 = new CategoryName('野菜')

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('should return false for different values', () => {
      // Arrange
      const name1 = new CategoryName('野菜')
      const name2 = new CategoryName('肉類')

      // Act & Assert
      expect(name1.equals(name2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return string representation', () => {
      // Arrange
      const name = new CategoryName('調味料')

      // Act & Assert
      expect(name.toString()).toBe('調味料')
    })
  })
})
