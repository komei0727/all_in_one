import { describe, it, expect, vi } from 'vitest'

import {
  InvalidFieldException,
  RequiredFieldException,
} from '@/modules/shared/server/domain/exceptions'
import { PrefixedCuidId } from '@/modules/shared/server/domain/value-objects'

// createIdのモック
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'clh7qp8kg0000qzrm5b8j5n8k'),
}))

// テスト用の具象クラス
class TestPrefixedCuidId extends PrefixedCuidId {
  protected getFieldName(): string {
    return 'テストID'
  }

  protected getPrefix(): string {
    return 'test_'
  }

  static generate(): TestPrefixedCuidId {
    return new TestPrefixedCuidId('test_clh7qp8kg0000qzrm5b8j5n8k')
  }
}

describe('PrefixedCuidId基底クラス', () => {
  describe('正常な値での作成', () => {
    it('プレフィックス付きCUIDで作成できる', () => {
      // Arrange
      const validId = 'test_clh7qp8kg0000qzrm5b8j5n8k'

      // Act
      const id = new TestPrefixedCuidId(validId)

      // Assert
      expect(id.getValue()).toBe(validId)
    })
  })

  describe('不正な値での作成', () => {
    it('プレフィックスが異なる場合エラーが発生する', () => {
      // Arrange
      const wrongPrefixId = 'wrong_clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert
      expect(() => new TestPrefixedCuidId(wrongPrefixId)).toThrow(InvalidFieldException)
      expect(() => new TestPrefixedCuidId(wrongPrefixId)).toThrow('test_で始まる必要があります')
    })

    it('プレフィックスがない場合エラーが発生する', () => {
      // Arrange
      const noPrefixId = 'clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert
      expect(() => new TestPrefixedCuidId(noPrefixId)).toThrow(InvalidFieldException)
      expect(() => new TestPrefixedCuidId(noPrefixId)).toThrow('test_で始まる必要があります')
    })

    it('プレフィックスのみの場合エラーが発生する', () => {
      // Arrange
      const prefixOnly = 'test_'

      // Act & Assert
      expect(() => new TestPrefixedCuidId(prefixOnly)).toThrow(InvalidFieldException)
      expect(() => new TestPrefixedCuidId(prefixOnly)).toThrow('CUID v2形式で入力してください')
    })

    it('CUID部分が不正な形式の場合エラーが発生する', () => {
      // Arrange
      const invalidCuidPart = 'test_invalid-cuid-format'

      // Act & Assert
      expect(() => new TestPrefixedCuidId(invalidCuidPart)).toThrow(InvalidFieldException)
      expect(() => new TestPrefixedCuidId(invalidCuidPart)).toThrow('CUID v2形式で入力してください')
    })

    it('空文字で作成するとエラーが発生する', () => {
      // Act & Assert
      expect(() => new TestPrefixedCuidId('')).toThrow(RequiredFieldException)
      expect(() => new TestPrefixedCuidId('')).toThrow('テストIDは必須です')
    })
  })

  describe('ID生成', () => {
    it('generateメソッドで新しいプレフィックス付きCUIDを生成できる', () => {
      // Act
      const id = TestPrefixedCuidId.generate()

      // Assert
      expect(id).toBeInstanceOf(TestPrefixedCuidId)
      expect(id.getValue()).toBe('test_clh7qp8kg0000qzrm5b8j5n8k')
      expect(id.getValue().startsWith('test_')).toBe(true)
    })
  })

  describe('CUID部分の取得', () => {
    it('getCoreId()でプレフィックスを除いたCUID部分を取得できる', () => {
      // Arrange
      const fullId = 'test_clh7qp8kg0000qzrm5b8j5n8k'
      const id = new TestPrefixedCuidId(fullId)

      // Act
      const coreId = id.getCoreId()

      // Assert
      expect(coreId).toBe('clh7qp8kg0000qzrm5b8j5n8k')
    })
  })

  describe('等価性比較', () => {
    it('同じ値のPrefixedCuidIdは等しい', () => {
      // Arrange
      const value = 'test_clh7qp8kg0000qzrm5b8j5n8k'
      const id1 = new TestPrefixedCuidId(value)
      const id2 = new TestPrefixedCuidId(value)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値のPrefixedCuidIdは等しくない', () => {
      // Arrange
      const id1 = new TestPrefixedCuidId('test_clh7qp8kg0000qzrm5b8j5n8k')
      const id2 = new TestPrefixedCuidId('test_clh7qp8kg0001qzrm5b8j5n8l')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
