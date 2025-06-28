import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { CheckedItem } from '@/modules/ingredients/server/domain/value-objects/checked-item.vo'
import { ExpiryStatus } from '@/modules/ingredients/server/domain/value-objects/expiry-status.vo'
import { IngredientId } from '@/modules/ingredients/server/domain/value-objects/ingredient-id.vo'
import { IngredientName } from '@/modules/ingredients/server/domain/value-objects/ingredient-name.vo'
import { StockStatus } from '@/modules/ingredients/server/domain/value-objects/stock-status.vo'

describe('CheckedItem', () => {
  describe('create', () => {
    it('有効なデータで作成できる', () => {
      // Given: 有効な確認済み食材データ
      const ingredientId = IngredientId.generate()
      const ingredientName = new IngredientName(faker.commerce.productName())
      const stockStatus = StockStatus.IN_STOCK
      const expiryStatus = ExpiryStatus.FRESH

      // When: CheckedItemを作成
      const checkedItem = CheckedItem.create({
        ingredientId,
        ingredientName,
        stockStatus,
        expiryStatus,
      })

      // Then: 正しく作成される
      expect(checkedItem.getIngredientId()).toBe(ingredientId)
      expect(checkedItem.getIngredientName()).toBe(ingredientName)
      expect(checkedItem.getStockStatus()).toBe(stockStatus)
      expect(checkedItem.getExpiryStatus()).toBe(expiryStatus)
      expect(checkedItem.getCheckedAt()).toBeInstanceOf(Date)
    })

    it('確認時刻を指定して作成できる', () => {
      // Given: 指定した確認時刻
      const checkedAt = new Date('2024-01-01T10:00:00Z')
      const ingredientId = IngredientId.generate()
      const ingredientName = new IngredientName(faker.commerce.productName())

      // When: 確認時刻を指定して作成
      const checkedItem = CheckedItem.create({
        ingredientId,
        ingredientName,
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.EXPIRING_SOON,
        checkedAt,
      })

      // Then: 指定した時刻が設定される
      expect(checkedItem.getCheckedAt()).toBe(checkedAt)
    })
  })

  describe('needsAttention', () => {
    it('在庫切れの場合はtrueを返す', () => {
      // Given: 在庫切れの食材
      const checkedItem = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.OUT_OF_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // Then: 注意が必要
      expect(checkedItem.needsAttention()).toBe(true)
    })

    it('在庫少の場合はtrueを返す', () => {
      // Given: 在庫少の食材
      const checkedItem = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // Then: 注意が必要
      expect(checkedItem.needsAttention()).toBe(true)
    })

    it('期限切れ間近の場合はtrueを返す', () => {
      // Given: 期限切れ間近の食材
      const checkedItem = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.EXPIRING_SOON,
      })

      // Then: 注意が必要
      expect(checkedItem.needsAttention()).toBe(true)
    })

    it('期限切れの場合はtrueを返す', () => {
      // Given: 期限切れの食材
      const checkedItem = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.EXPIRED,
      })

      // Then: 注意が必要
      expect(checkedItem.needsAttention()).toBe(true)
    })

    it('在庫有りかつ新鮮な場合はfalseを返す', () => {
      // Given: 問題のない食材
      const checkedItem = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // Then: 注意不要
      expect(checkedItem.needsAttention()).toBe(false)
    })
  })

  describe('getPriority', () => {
    it('優先度を計算できる', () => {
      // Given: 様々な状態の食材
      const highPriority = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.OUT_OF_STOCK,
        expiryStatus: ExpiryStatus.EXPIRED,
      })

      const mediumPriority = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      const lowPriority = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(faker.commerce.productName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // Then: 優先度が正しく計算される（在庫状態 + 期限状態）
      expect(highPriority.getPriority()).toBe(6) // 3 + 3
      expect(mediumPriority.getPriority()).toBe(3) // 2 + 1
      expect(lowPriority.getPriority()).toBe(2) // 1 + 1
    })
  })

  describe('toJSON', () => {
    it('JSONオブジェクトに変換できる', () => {
      // Given: CheckedItem
      const ingredientId = IngredientId.generate()
      const ingredientName = new IngredientName(faker.commerce.productName())
      const checkedAt = new Date('2024-01-01T10:00:00Z')
      const checkedItem = CheckedItem.create({
        ingredientId,
        ingredientName,
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.EXPIRING_SOON,
        checkedAt,
      })

      // When: JSON変換
      const json = checkedItem.toJSON()

      // Then: 正しい形式で出力される
      expect(json).toEqual({
        ingredientId: ingredientId.getValue(),
        ingredientName: ingredientName.getValue(),
        checkedAt: checkedAt.toISOString(),
        stockStatus: 'LOW_STOCK',
        expiryStatus: 'EXPIRING_SOON',
      })
    })
  })

  describe('equals', () => {
    it('同じ食材IDと確認時刻の場合はtrueを返す', () => {
      // Given: 同じ食材IDと確認時刻
      const ingredientId = IngredientId.generate()
      const checkedAt = new Date('2024-01-01T10:00:00Z')

      const item1 = CheckedItem.create({
        ingredientId,
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
        checkedAt,
      })

      const item2 = CheckedItem.create({
        ingredientId,
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.LOW_STOCK, // 異なる在庫状態でも
        expiryStatus: ExpiryStatus.EXPIRED, // 異なる期限状態でも
        checkedAt,
      })

      // Then: 等価と判定（食材IDと確認時刻のみで判定）
      expect(item1.equals(item2)).toBe(true)
    })

    it('異なる食材IDの場合はfalseを返す', () => {
      // Given: 異なる食材ID
      const checkedAt = new Date()
      const item1 = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
        checkedAt,
      })

      const item2 = CheckedItem.create({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
        checkedAt,
      })

      // Then: 非等価と判定
      expect(item1.equals(item2)).toBe(false)
    })

    it('異なる確認時刻の場合はfalseを返す', () => {
      // Given: 異なる確認時刻
      const ingredientId = IngredientId.generate()
      const item1 = CheckedItem.create({
        ingredientId,
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
        checkedAt: new Date('2024-01-01T10:00:00Z'),
      })

      const item2 = CheckedItem.create({
        ingredientId,
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
        checkedAt: new Date('2024-01-01T11:00:00Z'),
      })

      // Then: 非等価と判定
      expect(item1.equals(item2)).toBe(false)
    })
  })
})
