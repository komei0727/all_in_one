import { describe, it, expect } from 'vitest'

import { ValidationException } from '@/modules/ingredients/server/domain/exceptions'
import { IngredientStockId } from '@/modules/ingredients/server/domain/value-objects/ingredient-stock-id.vo'

import { testDataHelpers, faker } from '../../../../../../__fixtures__/builders/faker.config'

describe('IngredientStockId', () => {
  describe('constructor', () => {
    it('有効なCUID形式のIDで作成できる', () => {
      // 最小8文字の英数字
      const cuid = testDataHelpers.cuid()
      const id = new IngredientStockId(cuid)
      expect(id.getValue()).toBe(cuid)
    })

    it('8文字の英数字で作成できる', () => {
      // 最小文字数のテスト
      const validId = faker.string.alphanumeric(8)
      const id = new IngredientStockId(validId)
      expect(id.getValue()).toBe(validId)
    })

    it('大文字を含むIDで作成できる', () => {
      // 大文字小文字混在のテスト
      const validId = faker.string.alphanumeric({ length: 9, casing: 'mixed' })
      const id = new IngredientStockId(validId)
      expect(id.getValue()).toBe(validId)
    })
  })

  describe('validation', () => {
    it('空文字の場合はエラーを投げる', () => {
      // 空文字のバリデーション
      expect(() => new IngredientStockId('')).toThrow(ValidationException)
      expect(() => new IngredientStockId('')).toThrow('食材在庫IDは必須です')
    })

    it('空白文字のみの場合はエラーを投げる', () => {
      // 空白文字のバリデーション
      expect(() => new IngredientStockId('   ')).toThrow(ValidationException)
      expect(() => new IngredientStockId('   ')).toThrow('食材在庫IDは必須です')
    })

    it('7文字以下の場合はエラーを投げる', () => {
      // 最小文字数未満のバリデーション
      const shortId = faker.string.alphanumeric(6)
      expect(() => new IngredientStockId(shortId)).toThrow(ValidationException)
      expect(() => new IngredientStockId(shortId)).toThrow('食材在庫IDの形式が正しくありません')
    })

    it('英数字以外を含む場合はエラーを投げる', () => {
      // 特殊文字を含む場合のバリデーション
      const invalidIds = [
        faker.string.alphanumeric(5) + '-' + faker.string.alphanumeric(3),
        faker.string.alphanumeric(5) + '_' + faker.string.alphanumeric(3),
        faker.string.alphanumeric(5) + '@' + faker.string.alphanumeric(3),
        faker.string.alphanumeric(5) + '/' + faker.string.alphanumeric(3),
      ]

      invalidIds.forEach((invalidId) => {
        expect(() => new IngredientStockId(invalidId)).toThrow(ValidationException)
        expect(() => new IngredientStockId(invalidId)).toThrow('食材在庫IDの形式が正しくありません')
      })
    })
  })

  describe('generate', () => {
    it('新しいCUID形式のIDを生成できる', () => {
      // ID生成のテスト
      const id1 = IngredientStockId.generate()
      const id2 = IngredientStockId.generate()

      // 生成されたIDが有効であることを確認
      expect(id1).toBeInstanceOf(IngredientStockId)
      expect(id2).toBeInstanceOf(IngredientStockId)

      // IDがユニークであることを確認
      expect(id1.getValue()).not.toBe(id2.getValue())

      // 生成されたIDがCUID形式に準拠していることを確認
      expect(id1.getValue()).toMatch(/^c[a-zA-Z0-9]+$/)
      expect(id1.getValue().length).toBeGreaterThanOrEqual(8)
      expect(id1.getValue().length).toBeLessThanOrEqual(25)
    })

    it('生成されたIDは常に"c"で始まる', () => {
      // CUID形式のプレフィックス確認
      for (let i = 0; i < 10; i++) {
        const id = IngredientStockId.generate()
        expect(id.getValue()).toMatch(/^c/)
      }
    })
  })

  describe('equals', () => {
    it('同じ値のIDは等しいと判定される', () => {
      // 等価性のテスト
      const cuid = testDataHelpers.cuid()
      const id1 = new IngredientStockId(cuid)
      const id2 = new IngredientStockId(cuid)
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値のIDは等しくないと判定される', () => {
      // 非等価性のテスト
      const id1 = new IngredientStockId(testDataHelpers.cuid())
      const id2 = new IngredientStockId(testDataHelpers.cuid())
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
