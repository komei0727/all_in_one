import { describe, it, expect } from 'vitest'

import { ValueObject } from '@/modules/ingredients/server/domain/value-objects/value-object.base'

/**
 * テスト用の具体的な値オブジェクト実装
 */
class TestValueObject extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim() === '') {
      throw new Error('Value cannot be empty')
    }
  }
}

class NumberValueObject extends ValueObject<number> {
  protected validate(value: number): void {
    if (value < 0) {
      throw new Error('Value must be non-negative')
    }
  }
}

/**
 * ValueObject基底クラスのテスト
 *
 * テスト対象:
 * - 値の保持と取得
 * - バリデーション
 * - 等価性判定
 * - 文字列変換
 */
describe('ValueObject', () => {
  describe('constructor and getValue', () => {
    it('should store and return the value', () => {
      // Arrange & Act
      const vo = new TestValueObject('test value')

      // Assert
      expect(vo.getValue()).toBe('test value')
    })

    it('should validate the value on construction', () => {
      // Arrange & Act & Assert
      expect(() => new TestValueObject('')).toThrow('Value cannot be empty')
      expect(() => new TestValueObject('   ')).toThrow('Value cannot be empty')
    })
  })

  describe('equals', () => {
    it('should return true for equal values', () => {
      // Arrange
      const vo1 = new TestValueObject('same value')
      const vo2 = new TestValueObject('same value')

      // Act & Assert
      expect(vo1.equals(vo2)).toBe(true)
    })

    it('should return false for different values', () => {
      // Arrange
      const vo1 = new TestValueObject('value1')
      const vo2 = new TestValueObject('value2')

      // Act & Assert
      expect(vo1.equals(vo2)).toBe(false)
    })

    it('should return false for null or undefined', () => {
      // Arrange
      const vo = new TestValueObject('value')

      // Act & Assert
      expect(vo.equals(null as unknown as TestValueObject)).toBe(false)
      expect(vo.equals(undefined as unknown as TestValueObject)).toBe(false)
    })

    it('should return false for non-ValueObject instances', () => {
      // Arrange
      const vo = new TestValueObject('value')
      const notValueObject = { value: 'value' } as unknown as TestValueObject

      // Act & Assert
      expect(vo.equals(notValueObject)).toBe(false)
    })

    it('should work with different types', () => {
      // Arrange
      const numberVo1 = new NumberValueObject(42)
      const numberVo2 = new NumberValueObject(42)
      const numberVo3 = new NumberValueObject(100)

      // Act & Assert
      expect(numberVo1.equals(numberVo2)).toBe(true)
      expect(numberVo1.equals(numberVo3)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should convert string value to string', () => {
      // Arrange
      const vo = new TestValueObject('test string')

      // Act & Assert
      expect(vo.toString()).toBe('test string')
    })

    it('should convert number value to string', () => {
      // Arrange
      const vo = new NumberValueObject(42)

      // Act & Assert
      expect(vo.toString()).toBe('42')
    })
  })

  describe('immutability', () => {
    it('should be immutable', () => {
      // Arrange
      const vo = new TestValueObject('original value')
      const originalValue = vo.getValue()

      // Act - 値を取得しても元の値は変更されない
      const retrievedValue = vo.getValue()

      // Assert
      expect(retrievedValue).toBe('original value')
      expect(originalValue).toBe('original value')
    })
  })
})
