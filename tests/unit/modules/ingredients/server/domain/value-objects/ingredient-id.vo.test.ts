import { describe, expect, it, vi } from 'vitest'

import { IngredientId } from '@/modules/ingredients/server/domain/value-objects'
import { faker } from '@tests/__fixtures__/builders/faker.config'

// createIdのモック
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'clh7qp8kg0000qzrm5b8j5n8k'),
}))

describe('IngredientId', () => {
  describe('constructor', () => {
    it('有効なプレフィックス付きCUID形式の値で作成できる', () => {
      // Arrange
      const validId = 'ing_clh7qp8kg0000qzrm5b8j5n8k'

      // Act
      const ingredientId = new IngredientId(validId)

      // Assert
      expect(ingredientId.getValue()).toBe(validId)
    })

    it('プレフィックスが異なる場合エラーをスローする', () => {
      // Arrange
      const wrongPrefixId = 'stk_clh7qp8kg0000qzrm5b8j5n8k' // 在庫IDのプレフィックス

      // Act & Assert
      expect(() => new IngredientId(wrongPrefixId)).toThrow('ing_で始まる必要があります')
    })

    it('プレフィックスがない場合エラーをスローする', () => {
      // Arrange
      const noPrefixId = 'clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert
      expect(() => new IngredientId(noPrefixId)).toThrow('ing_で始まる必要があります')
    })

    it('CUID形式でない場合エラーをスローする', () => {
      // Arrange
      const invalidCuid = 'ing_' + faker.lorem.word() // ランダムな無効な文字列

      // Act & Assert
      expect(() => new IngredientId(invalidCuid)).toThrow('CUID v2形式で入力してください')
    })

    it('空文字の場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new IngredientId('')).toThrow('食材IDは必須です')
    })
  })

  describe('generate', () => {
    it('新しい食材IDを生成できる', () => {
      // Act
      const ingredientId = IngredientId.generate()

      // Assert
      expect(ingredientId).toBeInstanceOf(IngredientId)
      expect(ingredientId.getValue()).toBe('ing_clh7qp8kg0000qzrm5b8j5n8k')
      expect(ingredientId.getValue().startsWith('ing_')).toBe(true)
    })

    it('生成されるIDは正しいプレフィックスを持つ', () => {
      // Act
      const id = IngredientId.generate()

      // Assert
      expect(id.getValue().startsWith('ing_')).toBe(true)
      expect(id).toBeInstanceOf(IngredientId)
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const id = 'ing_clh7qp8kg0000qzrm5b8j5n8k'
      const id1 = new IngredientId(id)
      const id2 = new IngredientId(id)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const id1 = new IngredientId('ing_clh7qp8kg0000qzrm5b8j5n8k')
      const id2 = new IngredientId('ing_clh7qp8kg0001qzrm5b8j5n8l')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('getCoreId', () => {
    it('プレフィックスを除いたCUID部分を取得できる', () => {
      // Arrange
      const fullId = 'ing_clh7qp8kg0000qzrm5b8j5n8k'
      const id = new IngredientId(fullId)

      // Act
      const coreId = id.getCoreId()

      // Assert
      expect(coreId).toBe('clh7qp8kg0000qzrm5b8j5n8k')
    })
  })
})
