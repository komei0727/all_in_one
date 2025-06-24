import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'

import { IngredientId } from '@/modules/ingredients/server/domain/value-objects'

import { faker } from '../../../../../../__fixtures__/builders/faker.config'

describe('IngredientId', () => {
  describe('constructor', () => {
    it('有効なCUID形式の値で作成できる', () => {
      // CUID形式のIDでインスタンスを作成
      const validCuid = createId()
      const ingredientId = new IngredientId(validCuid)
      expect(ingredientId.getValue()).toBe(validCuid)
    })

    it('8文字以上の英数字とハイフン、アンダースコアを含むIDを許可する', () => {
      // 最小文字数（8文字）のテスト
      const minId = 'food1234'
      expect(() => new IngredientId(minId)).not.toThrow()

      // ハイフンを含むID
      const hyphenId = 'food-id-5678'
      expect(() => new IngredientId(hyphenId)).not.toThrow()

      // アンダースコアを含むID
      const underscoreId = 'food_id_9012'
      expect(() => new IngredientId(underscoreId)).not.toThrow()

      // 混合パターン
      const mixedId = 'food-id_3456-ABCD'
      expect(() => new IngredientId(mixedId)).not.toThrow()
    })

    it('UUID形式のIDを許可する', () => {
      // UUID v4形式（ハイフンを含む36文字）
      const uuid = faker.string.uuid()
      const ingredientId = new IngredientId(uuid)
      expect(ingredientId.getValue()).toBe(uuid)
    })

    it('空文字の場合エラーをスローする', () => {
      expect(() => new IngredientId('')).toThrow('食材IDは必須です')
    })

    it('空白文字のみの場合エラーをスローする', () => {
      expect(() => new IngredientId('   ')).toThrow('食材IDは必須です')
      expect(() => new IngredientId('\t\n')).toThrow('食材IDは必須です')
    })

    it('8文字未満の場合エラーをスローする', () => {
      expect(() => new IngredientId('food12')).toThrow(
        '食材IDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })

    it('許可されていない文字を含む場合エラーをスローする', () => {
      // スペースを含む
      expect(() => new IngredientId('food id 1234')).toThrow(
        '食材IDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )

      // 特殊文字を含む
      expect(() => new IngredientId('food@id#1234')).toThrow(
        '食材IDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )

      // 日本語を含む
      expect(() => new IngredientId('foodあいう1234')).toThrow(
        '食材IDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })
  })

  describe('generate', () => {
    it('新しい食材IDを生成できる', () => {
      // 新しいIDを生成
      const ingredientId = IngredientId.generate()

      expect(ingredientId).toBeInstanceOf(IngredientId)
      // 生成されたIDは8文字以上
      expect(ingredientId.getValue().length).toBeGreaterThanOrEqual(8)
      // 生成されたIDは許可された文字のみを含む
      expect(ingredientId.getValue()).toMatch(/^[a-zA-Z0-9\-_]+$/)
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
      const cuid = createId()
      const id1 = new IngredientId(cuid)
      const id2 = new IngredientId(cuid)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const id1 = new IngredientId(createId())
      const id2 = new IngredientId(createId())

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
