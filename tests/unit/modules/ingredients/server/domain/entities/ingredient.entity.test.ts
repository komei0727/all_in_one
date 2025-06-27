import { faker } from '@faker-js/faker/locale/ja'
import { describe, expect, it } from 'vitest'

import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Price,
  ExpiryInfo,
  IngredientStock,
  StorageLocation,
  StorageType,
  UnitId,
} from '@/modules/ingredients/server/domain/value-objects'

import { IngredientBuilder } from '../../../../../../__fixtures__/builders'
import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('Ingredient', () => {
  describe('constructor', () => {
    it('必須項目のみで食材を作成できる', () => {
      // ビルダーを使用してランダムなテストデータで検証
      const ingredient = new IngredientBuilder()
        .withUserId('user123')
        .withPurchaseDate(new Date())
        .build()

      // Assert
      expect(ingredient.getId()).toBeInstanceOf(IngredientId)
      expect(ingredient.getUserId()).toBe('user123')
      expect(ingredient.getName()).toBeInstanceOf(IngredientName)
      expect(ingredient.getCategoryId()).toBeInstanceOf(CategoryId)
      expect(ingredient.getMemo()).toBeNull()
      expect(ingredient.getExpiryInfo()).toBeNull()
      expect(ingredient.getIngredientStock()).not.toBeNull()
      expect(ingredient.getPrice()).toBeNull()
      expect(ingredient.getPurchaseDate()).toBeInstanceOf(Date)
      expect(ingredient.getCreatedAt()).toBeInstanceOf(Date)
      expect(ingredient.getUpdatedAt()).toBeInstanceOf(Date)
    })

    it('すべての項目を指定して食材を作成できる', () => {
      // Given: すべての項目を準備
      const userId = 'user123'
      const memo = new Memo('特売品')
      const price = new Price(298)
      const purchaseDate = faker.date.recent()
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: faker.date.future(),
        useByDate: null,
      })
      const ingredientStock = new IngredientStock({
        quantity: 3,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        threshold: 1,
      })

      // When: 食材を作成
      const ingredient = new IngredientBuilder()
        .withUserId(userId)
        .withMemo(memo)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock(ingredientStock)
        .withPrice(price)
        .withPurchaseDate(purchaseDate)
        .build()

      // Then: すべての値が正しく設定される
      expect(ingredient.getUserId()).toBe(userId)
      expect(ingredient.getMemo()).toBe(memo)
      expect(ingredient.getExpiryInfo()).toBe(expiryInfo)
      expect(ingredient.getIngredientStock()).toBe(ingredientStock)
      expect(ingredient.getPrice()).toBe(price)
      expect(ingredient.getPurchaseDate()).toBe(purchaseDate)
    })
  })

  describe('consume', () => {
    it('在庫を消費できる', () => {
      // Given: 在庫付きの食材を作成
      const ingredientStock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })
      const ingredient = new IngredientBuilder()
        .withUserId('user123')
        .withIngredientStock(ingredientStock)
        .build()

      // When: 在庫を消費
      ingredient.consume(3)

      // Then: 在庫が減る
      expect(ingredient.getIngredientStock().getQuantity()).toBe(7)
    })

    it('在庫が不足している場合はエラーになる', () => {
      // Given: 少ない在庫の食材
      const ingredientStock = new IngredientStock({
        quantity: 2,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })
      const ingredient = new IngredientBuilder()
        .withUserId('user123')
        .withIngredientStock(ingredientStock)
        .build()

      // When/Then: エラーが発生
      expect(() => ingredient.consume(5)).toThrow('在庫が不足しています')
    })
  })

  describe('replenish', () => {
    it('在庫を補充できる', () => {
      // Given: 在庫付きの食材を作成
      const ingredientStock = new IngredientStock({
        quantity: 5,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })
      const ingredient = new IngredientBuilder()
        .withUserId('user123')
        .withIngredientStock(ingredientStock)
        .build()

      // When: 在庫を補充
      ingredient.replenish(10)

      // Then: 在庫が増える
      expect(ingredient.getIngredientStock().getQuantity()).toBe(15)
    })
  })

  describe('update methods', () => {
    it('削除済みの食材は更新できない', () => {
      // Given: 削除済みの食材
      const ingredient = new IngredientBuilder().withUserId('user123').build()
      ingredient.delete()

      // When/Then: 更新しようとするとエラー
      const newMemo = new Memo('新しいメモ')
      expect(() => ingredient.updateMemo(newMemo)).toThrow('削除済みの食材は更新できません')
    })

    it('他のユーザーの食材は更新できない', () => {
      // Given: 別のユーザーの食材
      const ingredient = new IngredientBuilder().withUserId('user123').build()

      // When/Then: 別のユーザーが更新しようとするとエラー
      const newMemo = new Memo('新しいメモ')
      expect(() => ingredient.updateMemo(newMemo, 'user456')).toThrow(
        '他のユーザーの食材は更新できません'
      )
    })

    it('所有者は食材を更新できる', () => {
      // Given: 食材
      const ingredient = new IngredientBuilder()
        .withUserId('user123')
        .withMemo(new Memo('古いメモ'))
        .build()

      // When: 所有者が更新
      const newMemo = new Memo('新しいメモ')
      ingredient.updateMemo(newMemo, 'user123')

      // Then: 更新される
      expect(ingredient.getMemo()).toEqual(newMemo)
    })
  })

  describe('isExpired', () => {
    it('期限情報がない場合はfalseを返す', () => {
      // Given: 期限情報なしの食材
      const ingredient = new IngredientBuilder().withUserId('user123').withExpiryInfo(null).build()

      // When/Then
      expect(ingredient.isExpired()).toBe(false)
    })

    it('期限が過ぎている場合はtrueを返す', () => {
      // Given: 期限切れの食材
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: pastDate,
        useByDate: null,
      })
      const ingredient = new IngredientBuilder()
        .withUserId('user123')
        .withExpiryInfo(expiryInfo)
        .build()

      // When/Then
      expect(ingredient.isExpired()).toBe(true)
    })

    it('期限内の場合はfalseを返す', () => {
      // Given: 期限内の食材
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: futureDate,
        useByDate: null,
      })
      const ingredient = new IngredientBuilder()
        .withUserId('user123')
        .withExpiryInfo(expiryInfo)
        .build()

      // When/Then
      expect(ingredient.isExpired()).toBe(false)
    })
  })

  describe('delete', () => {
    it('所有者は食材を削除できる', () => {
      // Given: 食材
      const ingredient = new IngredientBuilder().withUserId('user123').build()

      // When: 所有者が削除
      ingredient.delete('user123')

      // Then: 削除される
      expect(ingredient.isDeleted()).toBe(true)
      expect(ingredient.getDeletedAt()).toBeInstanceOf(Date)
    })

    it('他のユーザーの食材は削除できない', () => {
      // Given: 別のユーザーの食材
      const ingredient = new IngredientBuilder().withUserId('user123').build()

      // When/Then: 別のユーザーが削除しようとするとエラー
      expect(() => ingredient.delete('user456')).toThrow('他のユーザーの食材は削除できません')
    })

    it('削除済みの食材は再削除できない', () => {
      // Given: 削除済みの食材
      const ingredient = new IngredientBuilder().withUserId('user123').build()
      ingredient.delete('user123')

      // When/Then: 再削除しようとするとエラー
      expect(() => ingredient.delete('user123')).toThrow('すでに削除されています')
    })
  })
})
