import { describe, expect, it } from 'vitest'

import { IngredientId } from '@/modules/ingredients/server/domain/value-objects/ingredient-id.vo'

describe('IngredientId', () => {
  describe('constructor', () => {
    it('有効なUUID形式の値で作成できる', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const ingredientId = new IngredientId(validUuid)

      // Assert
      expect(ingredientId.getValue()).toBe(validUuid)
    })

    it('無効なUUID形式の場合エラーをスローする', () => {
      // Arrange
      const invalidUuid = 'invalid-uuid'

      // Act & Assert
      expect(() => new IngredientId(invalidUuid)).toThrow('Invalid UUID format')
    })

    it('空文字の場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new IngredientId('')).toThrow('Invalid UUID format')
    })
  })

  describe('generate', () => {
    it('新しい食材IDを生成できる', () => {
      // Act
      const ingredientId = IngredientId.generate()

      // Assert
      expect(ingredientId).toBeInstanceOf(IngredientId)
      expect(ingredientId.getValue()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('生成されるIDは毎回異なる', () => {
      // Act
      const id1 = IngredientId.generate()
      const id2 = IngredientId.generate()

      // Assert
      expect(id1.getValue()).not.toBe(id2.getValue())
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const id1 = new IngredientId(uuid)
      const id2 = new IngredientId(uuid)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const id1 = new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      const id2 = new IngredientId('550e8400-e29b-41d4-a716-446655440001')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
