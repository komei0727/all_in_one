import { describe, expect, it } from 'vitest'

import {
  IngredientId,
  IngredientName,
  CategoryId,
  Quantity,
  Memo,
} from '@/modules/ingredients/server/domain/value-objects'

import { IngredientBuilder, IngredientStockBuilder } from '../../../../../../__fixtures__/builders'

describe('Ingredient', () => {
  describe('constructor', () => {
    it('食材を作成できる', () => {
      // ビルダーを使用してランダムなテストデータで検証
      const ingredient = new IngredientBuilder().withRandomName().withRandomMemo().build()

      // Assert
      expect(ingredient.getId()).toBeInstanceOf(IngredientId)
      expect(ingredient.getName()).toBeInstanceOf(IngredientName)
      expect(ingredient.getCategoryId()).toBeInstanceOf(CategoryId)
      expect(ingredient.getMemo()).toBeInstanceOf(Memo)
      expect(ingredient.getCurrentStock()).toBeNull()
      expect(ingredient.getCreatedAt()).toBeInstanceOf(Date)
      expect(ingredient.getUpdatedAt()).toBeInstanceOf(Date)
    })

    it('メモなしで食材を作成できる', () => {
      // メモなしで食材を作成
      const ingredient = new IngredientBuilder().withMemo(null).build()

      // Assert
      expect(ingredient.getMemo()).toBeNull()
    })
  })

  describe('setStock', () => {
    it('在庫を設定できる', () => {
      // 食材と在庫をビルダーで作成
      const ingredient = new IngredientBuilder().build()
      const stock = new IngredientStockBuilder().build()

      // Act
      ingredient.setStock(stock)

      // Assert
      expect(ingredient.getCurrentStock()).toEqual(stock)
      expect(ingredient.isInStock()).toBe(true)
    })

    it('在庫を更新すると更新日時が変わる', () => {
      // 食材と在庫をビルダーで作成
      const ingredient = new IngredientBuilder().build()
      const originalUpdatedAt = ingredient.getUpdatedAt()
      const stock = new IngredientStockBuilder().build()

      // Act (少し待ってから実行)
      setTimeout(() => {
        ingredient.setStock(stock)

        // Assert
        expect(ingredient.getUpdatedAt().getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
      }, 10)
    })
  })

  describe('removeStock', () => {
    it('在庫を削除できる', () => {
      // 在庫付きの食材を作成
      const ingredient = new IngredientBuilder().withDefaultStock().build()

      // Act
      ingredient.removeStock()

      // Assert
      expect(ingredient.getCurrentStock()).toBeNull()
      expect(ingredient.isInStock()).toBe(false)
    })
  })

  describe('update methods', () => {
    it('名前を更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().withName('トマト').build()

      // 新しい名前を準備
      const newName = new IngredientName('キャベツ')

      // Act
      ingredient.updateName(newName)

      // Assert
      expect(ingredient.getName()).toEqual(newName)
    })

    it('カテゴリーを更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().build()
      const newCategoryId = new CategoryId('550e8400-e29b-41d4-a716-446655440002')

      // Act
      ingredient.updateCategory(newCategoryId)

      // Assert
      expect(ingredient.getCategoryId()).toEqual(newCategoryId)
    })

    it('メモを更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().withMemo('古いメモ').build()

      // 新しいメモを準備
      const newMemo = new Memo('新しいメモ')

      // Act
      ingredient.updateMemo(newMemo)

      // Assert
      expect(ingredient.getMemo()).toEqual(newMemo)
    })

    it('削除済みの食材のメモを更新しようとするとエラー', () => {
      // 食材を作成して削除
      const ingredient = new IngredientBuilder().withMemo('メモ').build()
      ingredient.delete()
      const newMemo = new Memo('新しいメモ')

      // Act & Assert
      expect(() => ingredient.updateMemo(newMemo)).toThrow('削除済みの食材は更新できません')
    })

    it('更新時にユーザーIDが記録される', () => {
      // 食材を作成
      const ingredient = new IngredientBuilder().withMemo('古いメモ').build()
      const newMemo = new Memo('新しいメモ')
      const userId = 'user-123'

      // Act
      ingredient.updateMemo(newMemo, userId)

      // Assert
      expect(ingredient.getMemo()).toEqual(newMemo)
      expect(ingredient.getUpdatedBy()).toBe(userId)
    })
  })

  describe('isExpired', () => {
    it('在庫がない場合はfalseを返す', () => {
      // 在庫なしの食材を作成
      const ingredient = new IngredientBuilder().withoutStock().build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(false)
    })

    it('消費期限が過ぎている場合はtrueを返す', () => {
      // 期限切れの在庫を持つ食材を作成
      const ingredient = new IngredientBuilder().withExpiredStock().build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(true)
    })

    it('賞味期限のみで消費期限がない場合、賞味期限で判断する', () => {
      // 賞味期限が過ぎた在庫を作成
      const stock = new IngredientStockBuilder()
        .withPastBestBeforeDate()
        .withExpiryDate(null)
        .build()
      const ingredient = new IngredientBuilder().withStock(stock).build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(true)
    })

    it('期限内の場合はfalseを返す', () => {
      // 期限内の在庫を作成
      const stock = new IngredientStockBuilder()
        .withFutureExpiryDate()
        .withFutureBestBeforeDate()
        .build()
      const ingredient = new IngredientBuilder().withStock(stock).build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(false)
    })
  })

  describe('delete', () => {
    it('論理削除できる', () => {
      // 食材を作成
      const ingredient = new IngredientBuilder().build()

      // Act
      ingredient.delete()

      // Assert
      expect(ingredient.isDeleted()).toBe(true)
      expect(ingredient.getDeletedAt()).toBeInstanceOf(Date)
    })

    it('削除済みの食材は再削除できない', () => {
      // 食材を作成して削除
      const ingredient = new IngredientBuilder().build()
      ingredient.delete()

      // Act & Assert
      expect(() => ingredient.delete()).toThrow('すでに削除されています')
    })
  })

  describe('consume', () => {
    it('在庫を消費できる', () => {
      // 在庫付きの食材を作成
      const stock = new IngredientStockBuilder().withQuantity(10).build()
      const ingredient = new IngredientBuilder().withStock(stock).build()

      // Act
      ingredient.consume(new Quantity(3))

      // Assert
      expect(ingredient.getCurrentStock()?.getQuantity().getValue()).toBe(7)
    })

    it('在庫がない場合はエラーをスローする', () => {
      // 在庫なしの食材を作成
      const ingredient = new IngredientBuilder().withoutStock().build()

      // Act & Assert
      expect(() => ingredient.consume(new Quantity(1))).toThrow('在庫がありません')
    })
  })
})
