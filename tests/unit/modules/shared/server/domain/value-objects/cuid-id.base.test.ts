import { describe, it, expect, vi } from 'vitest'

import {
  InvalidFieldException,
  RequiredFieldException,
} from '@/modules/shared/server/domain/exceptions'
import { CuidId } from '@/modules/shared/server/domain/value-objects'

// createIdのモック
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'clh7qp8kg0000qzrm5b8j5n8k'),
}))

// テスト用の具象クラス
class TestCuidId extends CuidId {
  protected getFieldName(): string {
    return 'テストCUID'
  }

  static generate(): TestCuidId {
    return new TestCuidId('clh7qp8kg0000qzrm5b8j5n8k')
  }
}

describe('CuidId基底クラス', () => {
  describe('正常な値での作成', () => {
    it('有効なCUID形式で作成できる', () => {
      // CUID v2の形式
      const validCuid = 'clh7qp8kg0000qzrm5b8j5n8k'

      // Act
      const id = new TestCuidId(validCuid)

      // Assert
      expect(id.getValue()).toBe(validCuid)
    })

    it('25文字のCUID形式を受け入れる', () => {
      // 標準的なCUID v2は25文字
      const cuid25 = 'clh7qp8kg0000qzrm5b8j5n8k'

      // Act
      const id = new TestCuidId(cuid25)

      // Assert
      expect(id.getValue()).toBe(cuid25)
      expect(id.getValue().length).toBe(25)
    })
  })

  describe('不正な値での作成', () => {
    it('空文字で作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() => new TestCuidId('')).toThrow(RequiredFieldException)
      expect(() => new TestCuidId('')).toThrow('テストCUIDは必須です')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() => new TestCuidId(null as any)).toThrow(RequiredFieldException)
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() => new TestCuidId(undefined as any)).toThrow(RequiredFieldException)
    })

    it('CUID形式でない値で作成するとエラーが発生する', () => {
      const invalidValues = [
        'invalid-id', // 短すぎる
        '12345678901234567890123456789012', // 長すぎる（32文字）
        'INVALID_FORMAT_ID', // 大文字とアンダースコア
        'uuid-format-id-12345', // ハイフン含む
        '!@#$%^&*()', // 特殊文字
        'clh7qp8kg-000-qzrm5b8j5n8k', // ハイフン含む
      ]

      invalidValues.forEach((invalidValue) => {
        expect(() => new TestCuidId(invalidValue)).toThrow(InvalidFieldException)
        expect(() => new TestCuidId(invalidValue)).toThrow('CUID v2形式で入力してください')
      })
    })
  })

  describe('ID生成', () => {
    it('generateメソッドで新しいCUIDを生成できる', () => {
      // Act
      const id = TestCuidId.generate()

      // Assert
      expect(id).toBeInstanceOf(TestCuidId)
      expect(id.getValue()).toBe('clh7qp8kg0000qzrm5b8j5n8k')
      expect(id.getValue().length).toBe(25)
    })
  })

  describe('等価性比較', () => {
    it('同じ値のCuidIdは等しい', () => {
      // Arrange
      const value = 'clh7qp8kg0000qzrm5b8j5n8k'
      const id1 = new TestCuidId(value)
      const id2 = new TestCuidId(value)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値のCuidIdは等しくない', () => {
      // Arrange
      const id1 = new TestCuidId('clh7qp8kg0000qzrm5b8j5n8k')
      const id2 = new TestCuidId('clh7qp8kg0001qzrm5b8j5n8l')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('文字列変換', () => {
    it('toString()でCUID値が取得できる', () => {
      // Arrange
      const value = 'clh7qp8kg0000qzrm5b8j5n8k'
      const id = new TestCuidId(value)

      // Act & Assert
      expect(id.toString()).toBe(value)
    })
  })
})
