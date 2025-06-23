import { describe, expect, it } from 'vitest'

import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import {
  Quantity,
  UnitId,
  StorageLocation,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'

import { IngredientStockBuilder } from '../../../../../../__fixtures__/builders'

describe('IngredientStock', () => {
  describe('constructor', () => {
    it('在庫を作成できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder()
        .withQuantity(3)
        .withStorageType(StorageType.REFRIGERATED, '野菜室')
        .withFutureBestBeforeDate(10) // 10日後
        .withFutureExpiryDate(15) // 15日後
        .withPurchasedDaysAgo(11) // 11日前に購入
        .withPrice(300)
        .build()

      // Assert
      expect(stock.getQuantity().getValue()).toBe(3)
      expect(stock.getUnitId()).toBeInstanceOf(UnitId)
      expect(stock.getStorageLocation().getType()).toBe(StorageType.REFRIGERATED)
      expect(stock.getStorageLocation().getDetail()).toBe('野菜室')
      expect(stock.getBestBeforeDate()).toBeInstanceOf(Date)
      expect(stock.getExpiryDate()).toBeInstanceOf(Date)
      expect(stock.getPurchaseDate()).toBeInstanceOf(Date)
      expect(stock.getPrice()?.getValue()).toBe(300)
    })

    it('賞味期限・消費期限・価格なしで在庫を作成できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder()
        .withQuantity(3)
        .withStorageType(StorageType.ROOM_TEMPERATURE)
        .withBestBeforeDate(null)
        .withExpiryDate(null)
        .withoutPrice()
        .build()

      // Assert
      expect(stock.getBestBeforeDate()).toBeNull()
      expect(stock.getExpiryDate()).toBeNull()
      expect(stock.getPrice()).toBeNull()
    })
  })

  describe('consume', () => {
    it('在庫を消費できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder().withQuantity(5).build()

      // Act
      stock.consume(new Quantity(2))

      // Assert
      expect(stock.getQuantity().getValue()).toBe(3)
    })

    it('消費量が在庫を超える場合エラーをスローする', () => {
      // Arrange
      const stock = new IngredientStockBuilder().withQuantity(3).build()

      // Act & Assert
      expect(() => stock.consume(new Quantity(5))).toThrow('数量は0より大きい値を入力してください')
    })
  })

  describe('add', () => {
    it('在庫を追加できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder().withQuantity(3).build()

      // Act
      stock.add(new Quantity(2))

      // Assert
      expect(stock.getQuantity().getValue()).toBe(5)
    })
  })

  describe('updateStorageLocation', () => {
    it('保管場所を更新できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder().build()
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
      const stock = new IngredientStockBuilder()
        .withPastBestBeforeDate(-365) // 1年前の賞味期限
        .withPastExpiryDate(-360) // 360日前の消費期限
        .build()

      // Act & Assert
      expect(stock.isExpired()).toBe(true)
    })

    it('賞味期限内の場合falseを返す', () => {
      // Arrange
      const stock = new IngredientStockBuilder()
        .withFutureBestBeforeDate(365) // 1年後の賞味期限
        .withFutureExpiryDate(370) // 370日後の消費期限
        .build()

      // Act & Assert
      expect(stock.isExpired()).toBe(false)
    })

    it('賞味期限がnullの場合、消費期限で判定する', () => {
      // Arrange
      const expiredStock = new IngredientStockBuilder()
        .withBestBeforeDate(null)
        .withPastExpiryDate(-365) // 1年前の消費期限
        .build()
      const freshStock = new IngredientStockBuilder()
        .withBestBeforeDate(null)
        .withFutureExpiryDate(365) // 1年後の消費期限
        .build()

      // Act & Assert
      expect(expiredStock.isExpired()).toBe(true)
      expect(freshStock.isExpired()).toBe(false)
    })

    it('賞味期限と消費期限が両方nullの場合falseを返す', () => {
      // Arrange
      const stock = new IngredientStockBuilder()
        .withBestBeforeDate(null)
        .withExpiryDate(null)
        .build()

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
      const stock = new IngredientStockBuilder().withBestBeforeDate(futureDate).build()

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
      const stock = new IngredientStockBuilder().withBestBeforeDate(pastDate).build()

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
      const stock = new IngredientStockBuilder()
        .withBestBeforeDate(null)
        .withExpiryDate(futureDate)
        .build()

      // Act
      const days = stock.getDaysUntilExpiry()

      // Assert
      expect(days).toBe(15)
    })

    it('賞味期限と消費期限が両方nullの場合、nullを返す', () => {
      // Arrange
      const stock = new IngredientStockBuilder()
        .withBestBeforeDate(null)
        .withExpiryDate(null)
        .build()

      // Act
      const days = stock.getDaysUntilExpiry()

      // Assert
      expect(days).toBeNull()
    })
  })

  describe('delete', () => {
    it('在庫を論理削除できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder().build()

      // Act
      stock.delete()

      // Assert
      expect(stock.getDeletedAt()).not.toBeNull()
      expect(stock.getIsActive()).toBe(false)
    })

    it('削除時にユーザーIDを記録できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder().build()
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
      const stock = new IngredientStockBuilder().build()
      stock.delete()

      // Act & Assert
      expect(() => stock.delete()).toThrow('すでに削除されています')
    })
  })

  describe('削除済み在庫の操作制限', () => {
    it('削除済み在庫の保管場所を更新しようとするとエラー', () => {
      // Arrange
      const stock = new IngredientStockBuilder().build()
      stock.delete()
      const newLocation = new StorageLocation(StorageType.FROZEN, '冷凍庫')

      // Act & Assert
      expect(() => stock.updateStorageLocation(newLocation)).toThrow('無効な在庫です')
    })

    it('削除済み在庫を非アクティブ化しようとするとエラー', () => {
      // Arrange
      const stock = new IngredientStockBuilder().build()
      stock.delete()

      // Act & Assert
      expect(() => stock.deactivate()).toThrow('削除済みの在庫です')
    })

    it('非アクティブな在庫の保管場所を更新しようとするとエラー', () => {
      // Arrange
      const stock = new IngredientStockBuilder().build()
      stock.deactivate()
      const newLocation = new StorageLocation(StorageType.FROZEN, '冷凍庫')

      // Act & Assert
      expect(() => stock.updateStorageLocation(newLocation)).toThrow('無効な在庫です')
    })

    it('削除済み在庫を消費しようとするとエラー', () => {
      // Arrange
      const stock = new IngredientStockBuilder().withQuantity(10).build()
      stock.delete()

      // Act & Assert
      expect(() => stock.consume(new Quantity(3))).toThrow('無効な在庫です')
    })

    it('削除済み在庫に追加しようとするとエラー', () => {
      // Arrange
      const stock = new IngredientStockBuilder().withQuantity(10).build()
      stock.delete()

      // Act & Assert
      expect(() => stock.add(new Quantity(5))).toThrow('無効な在庫です')
    })

    it('非アクティブな在庫を消費しようとするとエラー', () => {
      // Arrange
      const stock = new IngredientStockBuilder().withQuantity(10).build()
      stock.deactivate()

      // Act & Assert
      expect(() => stock.consume(new Quantity(3))).toThrow('無効な在庫です')
    })

    it('非アクティブな在庫に追加しようとするとエラー', () => {
      // Arrange
      const stock = new IngredientStockBuilder().withQuantity(10).build()
      stock.deactivate()

      // Act & Assert
      expect(() => stock.add(new Quantity(5))).toThrow('無効な在庫です')
    })
  })

  describe('作成者・更新者の追跡', () => {
    it('作成時に作成者を記録できる', () => {
      // Arrange
      const builder = new IngredientStockBuilder()
        .withQuantity(3)
        .withStorageType(StorageType.REFRIGERATED, '野菜室')
        .withFutureBestBeforeDate(10)
        .withFutureExpiryDate(15)
        .withPurchasedDaysAgo(11)
        .withPrice(300)

      // Act - 直接IngredientStockを作成（createdByを指定）
      const props = (
        builder as unknown as { props: ConstructorParameters<typeof IngredientStock>[0] }
      ).props
      const stock = new IngredientStock({
        ...props,
        createdBy: 'user-001',
      })

      // Assert
      expect(stock.getCreatedBy()).toBe('user-001')
    })

    it('更新時に更新者を記録できる', () => {
      // Arrange
      const builder = new IngredientStockBuilder()
        .withQuantity(3)
        .withStorageType(StorageType.REFRIGERATED, '野菜室')
        .withFutureBestBeforeDate(10)
        .withFutureExpiryDate(15)
        .withPurchasedDaysAgo(11)
        .withPrice(300)

      // Act - 直接IngredientStockを作成（updatedByを指定）
      const props = (
        builder as unknown as { props: ConstructorParameters<typeof IngredientStock>[0] }
      ).props
      const stock = new IngredientStock({
        ...props,
        updatedBy: 'user-002',
      })

      // Assert
      expect(stock.getUpdatedBy()).toBe('user-002')
    })

    it('各操作で更新者を記録できる', () => {
      // Arrange
      const stock = new IngredientStockBuilder().build()
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
