import { describe, it, expect, vi } from 'vitest'

import {
  InvalidFieldException,
  RequiredFieldException,
} from '@/modules/ingredients/server/domain/exceptions'
import { IngredientStockId } from '@/modules/ingredients/server/domain/value-objects/ingredient-stock-id.vo'

import { faker } from '../../../../../../__fixtures__/builders/faker.config'

// createIdのモック
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'clh7qp8kg0000qzrm5b8j5n8k'),
}))

describe('IngredientStockId', () => {
  describe('constructor', () => {
    it('有効なプレフィックス付きCUID形式のIDで作成できる', () => {
      // プレフィックス付きCUID
      const validId = 'stk_clh7qp8kg0000qzrm5b8j5n8k'
      const id = new IngredientStockId(validId)
      expect(id.getValue()).toBe(validId)
    })

    it('プレフィックスが異なる場合エラーをスローする', () => {
      // 他のIDのプレフィックス
      const wrongPrefixId = 'ing_clh7qp8kg0000qzrm5b8j5n8k'
      expect(() => new IngredientStockId(wrongPrefixId)).toThrow(InvalidFieldException)
      expect(() => new IngredientStockId(wrongPrefixId)).toThrow('stk_で始まる必要があります')
    })

    it('プレフィックスがない場合エラーをスローする', () => {
      // プレフィックスなし
      const noPrefixId = 'clh7qp8kg0000qzrm5b8j5n8k'
      expect(() => new IngredientStockId(noPrefixId)).toThrow(InvalidFieldException)
      expect(() => new IngredientStockId(noPrefixId)).toThrow('stk_で始まる必要があります')
    })
  })

  describe('validation', () => {
    it('空文字の場合はエラーを投げる', () => {
      // 空文字のバリデーション
      expect(() => new IngredientStockId('')).toThrow(RequiredFieldException)
      expect(() => new IngredientStockId('')).toThrow('食材在庫IDは必須です')
    })

    it('空白文字のみの場合はエラーを投げる', () => {
      // 空白文字のバリデーション
      expect(() => new IngredientStockId('   ')).toThrow(RequiredFieldException)
      expect(() => new IngredientStockId('   ')).toThrow('食材在庫IDは必須です')
    })

    it('CUID形式でない場合はエラーを投げる', () => {
      // プレフィックス付きでもCUID部分が無効
      const invalidCuid = 'stk_' + faker.lorem.word()
      expect(() => new IngredientStockId(invalidCuid)).toThrow(InvalidFieldException)
      expect(() => new IngredientStockId(invalidCuid)).toThrow('CUID v2形式で入力してください')
    })

    it('プレフィックスのみの場合はエラーを投げる', () => {
      // プレフィックスのみ
      expect(() => new IngredientStockId('stk_')).toThrow(InvalidFieldException)
      expect(() => new IngredientStockId('stk_')).toThrow('CUID v2形式で入力してください')
    })
  })

  describe('generate', () => {
    it('新しいプレフィックス付きCUID形式のIDを生成できる', () => {
      // ID生成のテスト
      const id = IngredientStockId.generate()

      // 生成されたIDが有効であることを確認
      expect(id).toBeInstanceOf(IngredientStockId)
      expect(id.getValue()).toBe('stk_clh7qp8kg0000qzrm5b8j5n8k')
      expect(id.getValue().startsWith('stk_')).toBe(true)
    })

    it('生成されたIDは正しいプレフィックスを持つ', () => {
      // プレフィックス確認
      const id = IngredientStockId.generate()
      expect(id.getValue().startsWith('stk_')).toBe(true)
      expect(id).toBeInstanceOf(IngredientStockId)
    })
  })

  describe('equals', () => {
    it('同じ値のIDは等しいと判定される', () => {
      // 等価性のテスト
      const id = 'stk_clh7qp8kg0000qzrm5b8j5n8k'
      const id1 = new IngredientStockId(id)
      const id2 = new IngredientStockId(id)
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値のIDは等しくないと判定される', () => {
      // 非等価性のテスト
      const id1 = new IngredientStockId('stk_clh7qp8kg0000qzrm5b8j5n8k')
      const id2 = new IngredientStockId('stk_clh7qp8kg0001qzrm5b8j5n8l')
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('getCoreId', () => {
    it('プレフィックスを除いたCUID部分を取得できる', () => {
      // CUID部分の取得
      const fullId = 'stk_clh7qp8kg0000qzrm5b8j5n8k'
      const id = new IngredientStockId(fullId)
      const coreId = id.getCoreId()
      expect(coreId).toBe('clh7qp8kg0000qzrm5b8j5n8k')
    })
  })
})
