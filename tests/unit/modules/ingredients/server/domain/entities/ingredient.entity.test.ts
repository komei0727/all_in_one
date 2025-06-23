import { describe, expect, it } from 'vitest'

import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  UnitId,
  Quantity,
  Price,
  Memo,
  StorageLocation,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'

describe('Ingredient', () => {
  // テスト用のヘルパー関数
  const createTestIngredient = (
    params?: Partial<{
      id: IngredientId
      name: IngredientName
      categoryId: CategoryId
      memo: Memo
    }>
  ) => {
    return new Ingredient({
      id: params?.id ?? IngredientId.generate(),
      name: params?.name ?? new IngredientName('トマト'),
      categoryId: params?.categoryId ?? new CategoryId('550e8400-e29b-41d4-a716-446655440000'),
      memo: params?.memo ?? new Memo('新鮮なトマト'),
    })
  }

  const createTestStock = (
    params?: Partial<{
      quantity: Quantity
      unitId: UnitId
      storageLocation: StorageLocation
      bestBeforeDate: Date | null
      expiryDate: Date | null
      purchaseDate: Date
      price: Price | null
    }>
  ) => {
    return new IngredientStock({
      quantity: params?.quantity ?? new Quantity(3),
      unitId: params?.unitId ?? new UnitId('550e8400-e29b-41d4-a716-446655440001'),
      storageLocation:
        params?.storageLocation ?? new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
      bestBeforeDate: params?.bestBeforeDate ?? new Date('2024-12-31'),
      expiryDate: params?.expiryDate ?? new Date('2025-01-05'),
      purchaseDate: params?.purchaseDate ?? new Date('2024-12-20'),
      price: params?.price ?? new Price(300),
    })
  }

  describe('constructor', () => {
    it('食材を作成できる', () => {
      // Arrange
      const id = IngredientId.generate()
      const name = new IngredientName('トマト')
      const categoryId = new CategoryId('550e8400-e29b-41d4-a716-446655440000')
      const memo = new Memo('新鮮なトマト')

      // Act
      const ingredient = new Ingredient({
        id,
        name,
        categoryId,
        memo,
      })

      // Assert
      expect(ingredient.getId()).toEqual(id)
      expect(ingredient.getName()).toEqual(name)
      expect(ingredient.getCategoryId()).toEqual(categoryId)
      expect(ingredient.getMemo()).toEqual(memo)
      expect(ingredient.getCurrentStock()).toBeNull()
      expect(ingredient.getCreatedAt()).toBeInstanceOf(Date)
      expect(ingredient.getUpdatedAt()).toBeInstanceOf(Date)
    })

    it('メモなしで食材を作成できる', () => {
      // Arrange
      const id = IngredientId.generate()
      const name = new IngredientName('トマト')
      const categoryId = new CategoryId('550e8400-e29b-41d4-a716-446655440000')

      // Act
      const ingredient = new Ingredient({
        id,
        name,
        categoryId,
      })

      // Assert
      expect(ingredient.getMemo()).toBeNull()
    })
  })

  describe('setStock', () => {
    it('在庫を設定できる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const stock = createTestStock()

      // Act
      ingredient.setStock(stock)

      // Assert
      expect(ingredient.getCurrentStock()).toEqual(stock)
      expect(ingredient.isInStock()).toBe(true)
    })

    it('在庫を更新すると更新日時が変わる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const originalUpdatedAt = ingredient.getUpdatedAt()
      const stock = createTestStock()

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
      // Arrange
      const ingredient = createTestIngredient()
      const stock = createTestStock()
      ingredient.setStock(stock)

      // Act
      ingredient.removeStock()

      // Assert
      expect(ingredient.getCurrentStock()).toBeNull()
      expect(ingredient.isInStock()).toBe(false)
    })
  })

  describe('consume', () => {
    it('在庫を消費できる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const stock = createTestStock({ quantity: new Quantity(5) })
      ingredient.setStock(stock)

      // Act
      ingredient.consume(new Quantity(2))

      // Assert
      expect(ingredient.getCurrentStock()?.getQuantity().getValue()).toBe(3)
    })

    it('在庫がない場合エラーをスローする', () => {
      // Arrange
      const ingredient = createTestIngredient()

      // Act & Assert
      expect(() => ingredient.consume(new Quantity(1))).toThrow('在庫がありません')
    })

    it('消費量が在庫を超える場合エラーをスローする', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const stock = createTestStock({ quantity: new Quantity(3) })
      ingredient.setStock(stock)

      // Act & Assert
      expect(() => ingredient.consume(new Quantity(5))).toThrow('在庫が不足しています')
    })
  })

  describe('updateName', () => {
    it('名前を更新できる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const newName = new IngredientName('キャベツ')

      // Act
      ingredient.updateName(newName)

      // Assert
      expect(ingredient.getName()).toEqual(newName)
    })
  })

  describe('updateCategory', () => {
    it('カテゴリーを更新できる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const newCategoryId = new CategoryId('550e8400-e29b-41d4-a716-446655440002')

      // Act
      ingredient.updateCategory(newCategoryId)

      // Assert
      expect(ingredient.getCategoryId()).toEqual(newCategoryId)
    })
  })

  describe('updateMemo', () => {
    it('メモを更新できる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const newMemo = new Memo('有機栽培のトマト')

      // Act
      ingredient.updateMemo(newMemo)

      // Assert
      expect(ingredient.getMemo()).toEqual(newMemo)
    })

    it('メモをnullに更新できる', () => {
      // Arrange
      const ingredient = createTestIngredient({ memo: new Memo('元のメモ') })

      // Act
      ingredient.updateMemo(null)

      // Assert
      expect(ingredient.getMemo()).toBeNull()
    })
  })

  describe('isExpired', () => {
    it('賞味期限切れの場合trueを返す', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const expiredStock = createTestStock({
        bestBeforeDate: new Date('2020-01-01'),
        expiryDate: new Date('2020-01-05'),
      })
      ingredient.setStock(expiredStock)

      // Act & Assert
      expect(ingredient.isExpired()).toBe(true)
    })

    it('賞味期限内の場合falseを返す', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const freshStock = createTestStock({
        bestBeforeDate: new Date('2030-01-01'),
        expiryDate: new Date('2030-01-05'),
      })
      ingredient.setStock(freshStock)

      // Act & Assert
      expect(ingredient.isExpired()).toBe(false)
    })

    it('在庫がない場合falseを返す', () => {
      // Arrange
      const ingredient = createTestIngredient()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(false)
    })
  })

  describe('delete', () => {
    it('食材を論理削除できる', () => {
      // Arrange
      const ingredient = createTestIngredient()

      // Act
      ingredient.delete()

      // Assert
      expect(ingredient.getDeletedAt()).not.toBeNull()
      expect(ingredient.isDeleted()).toBe(true)
    })

    it('削除時にユーザーIDを記録できる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const userId = 'user-123'

      // Act
      ingredient.delete(userId)

      // Assert
      expect(ingredient.getDeletedAt()).not.toBeNull()
      expect(ingredient.isDeleted()).toBe(true)
      expect(ingredient.getUpdatedBy()).toBe(userId)
    })

    it('すでに削除済みの食材を削除しようとするとエラー', () => {
      // Arrange
      const ingredient = createTestIngredient()
      ingredient.delete()

      // Act & Assert
      expect(() => ingredient.delete()).toThrow('すでに削除されています')
    })
  })

  describe('削除済み食材の更新制限', () => {
    it('削除済み食材の名前を更新しようとするとエラー', () => {
      // Arrange
      const ingredient = createTestIngredient()
      ingredient.delete()
      const newName = new IngredientName('新しいトマト')

      // Act & Assert
      expect(() => ingredient.updateName(newName)).toThrow('削除済みの食材は更新できません')
    })

    it('削除済み食材のカテゴリーを更新しようとするとエラー', () => {
      // Arrange
      const ingredient = createTestIngredient()
      ingredient.delete()
      const newCategoryId = new CategoryId('550e8400-e29b-41d4-a716-446655440002')

      // Act & Assert
      expect(() => ingredient.updateCategory(newCategoryId)).toThrow(
        '削除済みの食材は更新できません'
      )
    })

    it('削除済み食材のメモを更新しようとするとエラー', () => {
      // Arrange
      const ingredient = createTestIngredient()
      ingredient.delete()
      const newMemo = new Memo('新しいメモ')

      // Act & Assert
      expect(() => ingredient.updateMemo(newMemo)).toThrow('削除済みの食材は更新できません')
    })
  })

  describe('作成者・更新者の追跡', () => {
    it('作成時に作成者を記録できる', () => {
      // Arrange & Act
      const ingredient = new Ingredient({
        id: IngredientId.generate(),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440000'),
        memo: new Memo('新鮮なトマト'),
        createdBy: 'user-001',
      })

      // Assert
      expect(ingredient.getCreatedBy()).toBe('user-001')
    })

    it('更新時に更新者を記録できる', () => {
      // Arrange & Act
      const ingredient = new Ingredient({
        id: IngredientId.generate(),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440000'),
        memo: new Memo('新鮮なトマト'),
        updatedBy: 'user-002',
      })

      // Assert
      expect(ingredient.getUpdatedBy()).toBe('user-002')
    })

    it('各操作で更新者を記録できる', () => {
      // Arrange
      const ingredient = createTestIngredient()
      const userId = 'user-003'

      // Act & Assert - setStock
      const stock = createTestStock()
      ingredient.setStock(stock, userId)
      expect(ingredient.getUpdatedBy()).toBe(userId)

      // Act & Assert - removeStock
      ingredient.removeStock(userId)
      expect(ingredient.getUpdatedBy()).toBe(userId)

      // Act & Assert - consume
      ingredient.setStock(createTestStock())
      ingredient.consume(new Quantity(1), userId)
      expect(ingredient.getUpdatedBy()).toBe(userId)

      // Act & Assert - updateName
      ingredient.updateName(new IngredientName('新しいトマト'), userId)
      expect(ingredient.getUpdatedBy()).toBe(userId)

      // Act & Assert - updateCategory
      ingredient.updateCategory(new CategoryId('550e8400-e29b-41d4-a716-446655440001'), userId)
      expect(ingredient.getUpdatedBy()).toBe(userId)

      // Act & Assert - updateMemo
      ingredient.updateMemo(new Memo('新しいメモ'), userId)
      expect(ingredient.getUpdatedBy()).toBe(userId)
    })
  })
})
