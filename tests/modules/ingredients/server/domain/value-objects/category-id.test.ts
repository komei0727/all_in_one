import { describe, it, expect } from 'vitest'

import { CategoryId } from '@/modules/ingredients/server/domain/value-objects/category-id.vo'

/**
 * CategoryId値オブジェクトのテスト
 *
 * テスト対象:
 * - 正常な値の受け入れ
 * - 空文字列の拒否
 * - 等価性判定
 */
describe('CategoryId', () => {
  describe('constructor', () => {
    it('should create with valid string', () => {
      // Arrange & Act
      const id = new CategoryId('cat123')

      // Assert
      expect(id.getValue()).toBe('cat123')
    })

    it('should throw error for empty string', () => {
      // Arrange & Act & Assert
      expect(() => new CategoryId('')).toThrow('カテゴリーIDは必須です')
    })

    it('should throw error for whitespace only string', () => {
      // Arrange & Act & Assert
      expect(() => new CategoryId('   ')).toThrow('カテゴリーIDは必須です')
    })

    it('should accept UUID format', () => {
      // Arrange & Act
      const uuid = '123e4567-e89b-12d3-a456-426614174000'
      const id = new CategoryId(uuid)

      // Assert
      expect(id.getValue()).toBe(uuid)
    })
  })

  describe('equals', () => {
    it('should return true for same values', () => {
      // Arrange
      const id1 = new CategoryId('cat123')
      const id2 = new CategoryId('cat123')

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('should return false for different values', () => {
      // Arrange
      const id1 = new CategoryId('cat123')
      const id2 = new CategoryId('cat456')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return string representation', () => {
      // Arrange
      const id = new CategoryId('cat123')

      // Act & Assert
      expect(id.toString()).toBe('cat123')
    })
  })
})
