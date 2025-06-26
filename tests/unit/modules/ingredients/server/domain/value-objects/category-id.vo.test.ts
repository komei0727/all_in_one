import { describe, it, expect, vi } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CategoryId } from '@/modules/ingredients/server/domain/value-objects'

// createIdのモック
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'clh7qp8kg0000qzrm5b8j5n8k'),
}))

describe('CategoryId', () => {
  describe('constructor', () => {
    // 正常系のテスト
    it('有効なプレフィックス付きCUIDでインスタンスを生成できる', () => {
      // Arrange
      const id = 'cat_clh7qp8kg0000qzrm5b8j5n8k'

      // Act
      const categoryId = new CategoryId(id)

      // Assert
      expect(categoryId.getValue()).toBe(id)
    })

    it('プレフィックスが異なる場合エラーをスローする', () => {
      // Arrange
      const wrongPrefixId = 'unt_clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert
      expect(() => new CategoryId(wrongPrefixId)).toThrow(InvalidFieldException)
      expect(() => new CategoryId(wrongPrefixId)).toThrow('cat_で始まる必要があります')
    })

    it('プレフィックスがない場合エラーをスローする', () => {
      // Arrange
      const noPrefixId = 'clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert
      expect(() => new CategoryId(noPrefixId)).toThrow(InvalidFieldException)
      expect(() => new CategoryId(noPrefixId)).toThrow('cat_で始まる必要があります')
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      expect(() => new CategoryId('')).toThrow(RequiredFieldException)
      expect(() => new CategoryId('')).toThrow('カテゴリーIDは必須です')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      expect(() => new CategoryId('   ')).toThrow(RequiredFieldException)
    })

    it('CUID形式でない場合エラーをスローする', () => {
      const invalidCuid = 'cat_invalid-format'
      expect(() => new CategoryId(invalidCuid)).toThrow(InvalidFieldException)
      expect(() => new CategoryId(invalidCuid)).toThrow('CUID v2形式で入力してください')
    })
  })

  describe('generate', () => {
    it('新しいカテゴリーIDを生成できる', () => {
      // Act
      const categoryId = CategoryId.generate()

      // Assert
      expect(categoryId).toBeInstanceOf(CategoryId)
      expect(categoryId.getValue()).toBe('cat_clh7qp8kg0000qzrm5b8j5n8k')
      expect(categoryId.getValue().startsWith('cat_')).toBe(true)
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const id = 'cat_clh7qp8kg0000qzrm5b8j5n8k'
      const id1 = new CategoryId(id)
      const id2 = new CategoryId(id)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const id1 = new CategoryId('cat_clh7qp8kg0000qzrm5b8j5n8k')
      const id2 = new CategoryId('cat_clh7qp8kg0001qzrm5b8j5n8l')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('getCoreId', () => {
    it('プレフィックスを除いたCUID部分を取得できる', () => {
      // Arrange
      const fullId = 'cat_clh7qp8kg0000qzrm5b8j5n8k'
      const id = new CategoryId(fullId)

      // Act
      const coreId = id.getCoreId()

      // Assert
      expect(coreId).toBe('clh7qp8kg0000qzrm5b8j5n8k')
    })
  })
})
