import { describe, expect, it } from 'vitest'

import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import {
  Quantity,
  UnitId,
  StorageLocation,
  StorageType,
  Price,
} from '@/modules/ingredients/server/domain/value-objects'

describe('IngredientStock', () => {
  // テスト用のヘルパー関数
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
      bestBeforeDate:
        params?.bestBeforeDate !== undefined ? params.bestBeforeDate : new Date('2024-12-31'),
      expiryDate: params?.expiryDate !== undefined ? params.expiryDate : new Date('2025-01-05'),
      purchaseDate: params?.purchaseDate ?? new Date('2024-12-20'),
      price: params?.price !== undefined ? params.price : new Price(300),
    })
  }

  describe('constructor', () => {
    it('在庫を作成できる', () => {
      // Arrange
      const quantity = new Quantity(3)
      const unitId = new UnitId('550e8400-e29b-41d4-a716-446655440001')
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED, '野菜室')
      const bestBeforeDate = new Date('2024-12-31')
      const expiryDate = new Date('2025-01-05')
      const purchaseDate = new Date('2024-12-20')
      const price = new Price(300)

      // Act
      const stock = new IngredientStock({
        quantity,
        unitId,
        storageLocation,
        bestBeforeDate,
        expiryDate,
        purchaseDate,
        price,
      })

      // Assert
      expect(stock.getQuantity()).toEqual(quantity)
      expect(stock.getUnitId()).toEqual(unitId)
      expect(stock.getStorageLocation()).toEqual(storageLocation)
      expect(stock.getBestBeforeDate()).toEqual(bestBeforeDate)
      expect(stock.getExpiryDate()).toEqual(expiryDate)
      expect(stock.getPurchaseDate()).toEqual(purchaseDate)
      expect(stock.getPrice()).toEqual(price)
    })

    it('賞味期限・消費期限・価格なしで在庫を作成できる', () => {
      // Arrange
      const quantity = new Quantity(3)
      const unitId = new UnitId('550e8400-e29b-41d4-a716-446655440001')
      const storageLocation = new StorageLocation(StorageType.ROOM_TEMPERATURE)
      const purchaseDate = new Date('2024-12-20')

      // Act
      const stock = new IngredientStock({
        quantity,
        unitId,
        storageLocation,
        bestBeforeDate: null,
        expiryDate: null,
        purchaseDate,
        price: null,
      })

      // Assert
      expect(stock.getBestBeforeDate()).toBeNull()
      expect(stock.getExpiryDate()).toBeNull()
      expect(stock.getPrice()).toBeNull()
    })
  })

  describe('consume', () => {
    it('在庫を消費できる', () => {
      // Arrange
      const stock = createTestStock({ quantity: new Quantity(5) })

      // Act
      stock.consume(new Quantity(2))

      // Assert
      expect(stock.getQuantity().getValue()).toBe(3)
    })

    it('消費量が在庫を超える場合エラーをスローする', () => {
      // Arrange
      const stock = createTestStock({ quantity: new Quantity(3) })

      // Act & Assert
      expect(() => stock.consume(new Quantity(5))).toThrow('数量は0より大きい値を入力してください')
    })
  })

  describe('add', () => {
    it('在庫を追加できる', () => {
      // Arrange
      const stock = createTestStock({ quantity: new Quantity(3) })

      // Act
      stock.add(new Quantity(2))

      // Assert
      expect(stock.getQuantity().getValue()).toBe(5)
    })
  })

  describe('updateStorageLocation', () => {
    it('保管場所を更新できる', () => {
      // Arrange
      const stock = createTestStock()
      const newLocation = new StorageLocation(StorageType.FROZEN, '冷凍庫上段')

      // Act
      stock.updateStorageLocation(newLocation)

      // Assert
      expect(stock.getStorageLocation()).toEqual(newLocation)
    })
  })

  describe('isExpired', () => {
    it('賞味期限切れの場合trueを返す', () => {
      // Arrange
      const stock = createTestStock({
        bestBeforeDate: new Date('2020-01-01'),
        expiryDate: new Date('2020-01-05'),
      })

      // Act & Assert
      expect(stock.isExpired()).toBe(true)
    })

    it('賞味期限内の場合falseを返す', () => {
      // Arrange
      const stock = createTestStock({
        bestBeforeDate: new Date('2030-01-01'),
        expiryDate: new Date('2030-01-05'),
      })

      // Act & Assert
      expect(stock.isExpired()).toBe(false)
    })

    it('賞味期限がnullの場合、消費期限で判定する', () => {
      // Arrange
      const expiredStock = createTestStock({
        bestBeforeDate: null,
        expiryDate: new Date('2020-01-05'),
      })
      const freshStock = createTestStock({
        bestBeforeDate: null,
        expiryDate: new Date('2030-01-05'),
      })

      // Act & Assert
      expect(expiredStock.isExpired()).toBe(true)
      expect(freshStock.isExpired()).toBe(false)
    })

    it('賞味期限と消費期限が両方nullの場合falseを返す', () => {
      // Arrange
      const stock = createTestStock({
        bestBeforeDate: null,
        expiryDate: null,
      })

      // Act & Assert
      expect(stock.isExpired()).toBe(false)
    })
  })

  describe('getDaysUntilExpiry', () => {
    it('賞味期限までの日数を返す', () => {
      // Arrange
      const today = new Date()
      const futureDate = new Date(today)
      futureDate.setDate(today.getDate() + 10)
      const stock = createTestStock({
        bestBeforeDate: futureDate,
      })

      // Act
      const days = stock.getDaysUntilExpiry()

      // Assert
      expect(days).toBe(10)
    })

    it('賞味期限が過ぎている場合、負の値を返す', () => {
      // Arrange
      const today = new Date()
      const pastDate = new Date(today)
      pastDate.setDate(today.getDate() - 5)
      const stock = createTestStock({
        bestBeforeDate: pastDate,
      })

      // Act
      const days = stock.getDaysUntilExpiry()

      // Assert
      expect(days).toBe(-5)
    })

    it('賞味期限がnullの場合、消費期限までの日数を返す', () => {
      // Arrange
      const today = new Date()
      const futureDate = new Date(today)
      futureDate.setDate(today.getDate() + 15)
      const stock = createTestStock({
        bestBeforeDate: null,
        expiryDate: futureDate,
      })

      // Act
      const days = stock.getDaysUntilExpiry()

      // Assert
      expect(days).toBe(15)
    })

    it('賞味期限と消費期限が両方nullの場合、nullを返す', () => {
      // Arrange
      const stock = createTestStock({
        bestBeforeDate: null,
        expiryDate: null,
      })

      // Act
      const days = stock.getDaysUntilExpiry()

      // Assert
      expect(days).toBeNull()
    })
  })

  describe('delete', () => {
    it('在庫を論理削除できる', () => {
      // Arrange
      const stock = createTestStock()

      // Act
      stock.delete()

      // Assert
      expect(stock.getDeletedAt()).not.toBeNull()
      expect(stock.getIsActive()).toBe(false)
    })

    it('削除時にユーザーIDを記録できる', () => {
      // Arrange
      const stock = createTestStock()
      const userId = 'user-123'

      // Act
      stock.delete(userId)

      // Assert
      expect(stock.getDeletedAt()).not.toBeNull()
      expect(stock.getIsActive()).toBe(false)
      expect(stock.getUpdatedBy()).toBe(userId)
    })

    it('すでに削除済みの在庫を削除しようとするとエラー', () => {
      // Arrange
      const stock = createTestStock()
      stock.delete()

      // Act & Assert
      expect(() => stock.delete()).toThrow('すでに削除されています')
    })
  })

  describe('削除済み在庫の操作制限', () => {
    it('削除済み在庫の保管場所を更新しようとするとエラー', () => {
      // Arrange
      const stock = createTestStock()
      stock.delete()
      const newLocation = new StorageLocation(StorageType.FROZEN, '冷凍庫')

      // Act & Assert
      expect(() => stock.updateStorageLocation(newLocation)).toThrow('無効な在庫です')
    })

    it('削除済み在庫を非アクティブ化しようとするとエラー', () => {
      // Arrange
      const stock = createTestStock()
      stock.delete()

      // Act & Assert
      expect(() => stock.deactivate()).toThrow('削除済みの在庫です')
    })

    it('非アクティブな在庫の保管場所を更新しようとするとエラー', () => {
      // Arrange
      const stock = createTestStock()
      stock.deactivate()
      const newLocation = new StorageLocation(StorageType.FROZEN, '冷凍庫')

      // Act & Assert
      expect(() => stock.updateStorageLocation(newLocation)).toThrow('無効な在庫です')
    })
  })

  describe('作成者・更新者の追跡', () => {
    it('作成時に作成者を記録できる', () => {
      // Arrange & Act
      const stock = new IngredientStock({
        quantity: new Quantity(3),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440001'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        bestBeforeDate: new Date('2024-12-31'),
        expiryDate: new Date('2025-01-05'),
        purchaseDate: new Date('2024-12-20'),
        price: new Price(300),
        createdBy: 'user-001',
      })

      // Assert
      expect(stock.getCreatedBy()).toBe('user-001')
    })

    it('更新時に更新者を記録できる', () => {
      // Arrange
      const stock = new IngredientStock({
        quantity: new Quantity(3),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440001'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        bestBeforeDate: new Date('2024-12-31'),
        expiryDate: new Date('2025-01-05'),
        purchaseDate: new Date('2024-12-20'),
        price: new Price(300),
        updatedBy: 'user-002',
      })

      // Assert
      expect(stock.getUpdatedBy()).toBe('user-002')
    })

    it('各操作で更新者を記録できる', () => {
      // Arrange
      const stock = createTestStock()
      const userId = 'user-003'

      // Act & Assert - consume
      stock.consume(new Quantity(1), userId)
      expect(stock.getUpdatedBy()).toBe(userId)

      // Act & Assert - add
      stock.add(new Quantity(2), userId)
      expect(stock.getUpdatedBy()).toBe(userId)

      // Act & Assert - updateStorageLocation
      stock.updateStorageLocation(new StorageLocation(StorageType.FROZEN, '冷凍庫'), userId)
      expect(stock.getUpdatedBy()).toBe(userId)

      // Act & Assert - deactivate
      stock.deactivate(userId)
      expect(stock.getUpdatedBy()).toBe(userId)
    })
  })
})
