import { describe, it, expect } from 'vitest'

import { RequiredFieldException } from '@/modules/shared/server/domain/exceptions'
import { StringId } from '@/modules/shared/server/domain/value-objects'

// テスト用の具象クラス
class TestStringId extends StringId {
  protected getFieldName(): string {
    return 'テストID'
  }
}

describe('StringId基底クラス', () => {
  describe('正常な値での作成', () => {
    it('有効な文字列IDで作成できる', () => {
      // Arrange
      const value = 'test-id-123'

      // Act
      const id = new TestStringId(value)

      // Assert
      expect(id.getValue()).toBe('test-id-123')
    })

    it('コンストラクタで作成できる', () => {
      // Arrange
      const value = 'constructor-id-456'

      // Act
      const id = new TestStringId(value)

      // Assert
      expect(id).toBeInstanceOf(TestStringId)
      expect(id.getValue()).toBe('constructor-id-456')
    })
  })

  describe('不正な値での作成', () => {
    it('空文字で作成するとエラーが発生する', () => {
      // Arrange
      const emptyValue = ''

      // Act & Assert
      expect(() => new TestStringId(emptyValue)).toThrow(RequiredFieldException)
      expect(() => new TestStringId(emptyValue)).toThrow('テストIDは必須です')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange
      const nullValue = null as any

      // Act & Assert
      expect(() => new TestStringId(nullValue)).toThrow(RequiredFieldException)
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange
      const undefinedValue = undefined as any

      // Act & Assert
      expect(() => new TestStringId(undefinedValue)).toThrow(RequiredFieldException)
    })
  })

  describe('等価性比較', () => {
    it('同じ値のStringIdは等しい', () => {
      // Arrange
      const value = 'same-id'
      const id1 = new TestStringId(value)
      const id2 = new TestStringId(value)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値のStringIdは等しくない', () => {
      // Arrange
      const id1 = new TestStringId('id-1')
      const id2 = new TestStringId('id-2')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })

    it('StringId以外のオブジェクトとは等しくない', () => {
      // Arrange
      const id = new TestStringId('test-id')
      const other = { value: 'test-id' } as any

      // Act & Assert
      expect(id.equals(other)).toBe(false)
    })
  })

  describe('文字列変換', () => {
    it('toString()でID値が取得できる', () => {
      // Arrange
      const value = 'string-id-789'
      const id = new TestStringId(value)

      // Act & Assert
      expect(id.toString()).toBe('string-id-789')
    })
  })
})
