import { faker } from '@faker-js/faker/locale/ja'
import { describe, expect, it } from 'vitest'

import {
  IngredientCreated,
  StockConsumed,
  StockDepleted,
  StockReplenished,
  IngredientUpdated,
  IngredientDeleted,
  IngredientExpired,
  IngredientExpiringSoon,
} from '@/modules/ingredients/server/domain/events'
import { IngredientName, CategoryId } from '@/modules/ingredients/server/domain/value-objects'
import { IngredientBuilder } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('Ingredient ドメインイベント発行', () => {
  describe('食材作成イベント', () => {
    it('新規作成フラグがtrueの場合、IngredientCreatedイベントを発行する', () => {
      // 新規作成フラグを設定してエンティティを作成
      const userId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder()
        .withUserId(userId)
        .withIsNew(true) // 新規作成フラグを設定
        .build()

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(IngredientCreated)

      const event = events[0] as IngredientCreated
      expect(event.ingredientId).toBe(ingredient.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.ingredientName).toBe(ingredient.getName().getValue())
      expect(event.categoryId).toBe(ingredient.getCategoryId().getValue())
      expect(event.initialQuantity).toBe(ingredient.getIngredientStock().getQuantity())
      expect(event.unitId).toBe(ingredient.getIngredientStock().getUnitId().getValue())
    })

    it('新規作成フラグがfalseの場合、IngredientCreatedイベントを発行しない', () => {
      // 既存エンティティとして作成（デフォルト動作）
      const ingredient = new IngredientBuilder().build()

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(0)
    })
  })

  describe('在庫消費イベント', () => {
    it('消費時にStockConsumedイベントを発行する', () => {
      // 在庫消費時にイベントが発行されることを確認
      const userId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder().withUserId(userId).withQuantity(10).build()
      ingredient.markEventsAsCommitted() // 作成イベントをクリア

      // Act
      ingredient.consume(3)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(StockConsumed)

      const event = events[0] as StockConsumed
      expect(event.ingredientId).toBe(ingredient.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.consumedAmount).toBe(3)
      expect(event.remainingAmount).toBe(7)
      expect(event.unitId).toBe(ingredient.getIngredientStock().getUnitId().getValue())
    })

    it('在庫を全部消費した場合もイベントを発行する', () => {
      // 在庫切れになる消費でもイベントが発行されることを確認
      const userId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder().withUserId(userId).withQuantity(5).build()
      ingredient.markEventsAsCommitted()

      // Act
      ingredient.consume(5)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(2) // StockConsumed + StockDepleted

      const consumedEvent = events[0] as StockConsumed
      expect(consumedEvent.remainingAmount).toBe(0)

      const depletedEvent = events[1] as StockDepleted
      expect(depletedEvent).toBeInstanceOf(StockDepleted)
      expect(depletedEvent.ingredientId).toBe(ingredient.getId().getValue())
      expect(depletedEvent.userId).toBe(userId)
      expect(depletedEvent.ingredientName).toBe(ingredient.getName().getValue())
    })
  })

  describe('在庫補充イベント', () => {
    it('補充時にStockReplenishedイベントを発行する', () => {
      // 在庫補充時にイベントが発行されることを確認
      const userId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder().withUserId(userId).withQuantity(2).build()
      ingredient.markEventsAsCommitted()

      // Act
      ingredient.replenish(5)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(StockReplenished)

      const event = events[0] as StockReplenished
      expect(event.ingredientId).toBe(ingredient.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.replenishedAmount).toBe(5)
      expect(event.previousAmount).toBe(2)
      expect(event.newTotalAmount).toBe(7)
      expect(event.unitId).toBe(ingredient.getIngredientStock().getUnitId().getValue())
    })
  })

  describe('食材更新イベント', () => {
    it('名前更新時にIngredientUpdatedイベントを発行する', () => {
      // 名前更新時にイベントが発行されることを確認
      const userId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder().withUserId(userId).withName('トマト').build()
      ingredient.markEventsAsCommitted()

      // Act
      const newName = new IngredientName('プチトマト')
      ingredient.updateName(newName, userId)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(IngredientUpdated)

      const event = events[0] as IngredientUpdated
      expect(event.ingredientId).toBe(ingredient.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.changes).toEqual({
        name: { from: 'トマト', to: 'プチトマト' },
      })
    })

    it('カテゴリー更新時にIngredientUpdatedイベントを発行する', () => {
      // カテゴリー更新時にイベントが発行されることを確認
      const userId = testDataHelpers.userId()
      const categoryId1 = testDataHelpers.categoryId()
      const categoryId2 = testDataHelpers.categoryId()

      const ingredient = new IngredientBuilder()
        .withUserId(userId)
        .withCategoryId(categoryId1)
        .build()
      ingredient.markEventsAsCommitted()

      // Act
      const newCategoryId = new CategoryId(categoryId2)
      ingredient.updateCategory(newCategoryId, userId)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      const event = events[0] as IngredientUpdated
      expect(event.changes).toEqual({
        categoryId: { from: categoryId1, to: categoryId2 },
      })
    })
  })

  describe('食材削除イベント', () => {
    it('削除時にIngredientDeletedイベントを発行する', () => {
      // 削除時にイベントが発行されることを確認
      const userId = testDataHelpers.userId()
      const categoryId = testDataHelpers.categoryId()

      const ingredient = new IngredientBuilder()
        .withUserId(userId)
        .withName('トマト')
        .withCategoryId(categoryId)
        .withQuantity(3)
        .build()
      ingredient.markEventsAsCommitted()

      // Act
      ingredient.delete(userId)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(IngredientDeleted)

      const event = events[0] as IngredientDeleted
      expect(event.ingredientId).toBe(ingredient.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.ingredientName).toBe('トマト')
      expect(event.categoryId).toBe(categoryId)
      expect(event.lastQuantity).toBe(3)
      expect(event.unitId).toBe(ingredient.getIngredientStock().getUnitId().getValue())
      expect(event.reason).toBe('user-action')
    })
  })

  describe('期限切れイベント', () => {
    it('期限切れチェック時にIngredientExpiredイベントを発行する', () => {
      // 期限切れ検知時にイベントが発行されることを確認
      const userId = testDataHelpers.userId()
      const categoryId = testDataHelpers.categoryId()
      const expiredDate = faker.date.past()

      const ingredient = new IngredientBuilder()
        .withUserId(userId)
        .withName('トマト')
        .withCategoryId(categoryId)
        .withQuantity(2)
        .withExpiryInfo({ bestBeforeDate: expiredDate })
        .build()
      ingredient.markEventsAsCommitted()

      // Act
      const expired = ingredient.checkAndNotifyExpiry()

      // Assert
      expect(expired).toBe(true)
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(IngredientExpired)

      const event = events[0] as IngredientExpired
      expect(event.ingredientId).toBe(ingredient.getId().getValue())
      expect(event.ingredientName).toBe('トマト')
      expect(event.categoryId).toBe(categoryId)
      expect(event.expiredDate).toEqual(expiredDate)
      expect(event.remainingQuantity).toBe(2)
      expect(event.unitId).toBe(ingredient.getIngredientStock().getUnitId().getValue())
    })

    it('期限切れでない場合はイベントを発行しない', () => {
      // 期限内の場合はイベントが発行されないことを確認
      const futureDate = faker.date.future()
      const ingredient = new IngredientBuilder()
        .withExpiryInfo({ bestBeforeDate: futureDate })
        .build()
      ingredient.markEventsAsCommitted()

      // Act
      const expired = ingredient.checkAndNotifyExpiry()

      // Assert
      expect(expired).toBe(false)
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(0)
    })
  })

  describe('期限切れ間近イベント', () => {
    it('期限切れ間近の通知でIngredientExpiringSoonイベントを発行する', () => {
      // 期限切れ間近の食材を作成
      const userId = testDataHelpers.userId()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5) // 5日後

      const ingredient = new IngredientBuilder()
        .withUserId(userId)
        .withName('期限間近の牛乳')
        .withExpiryInfo({ bestBeforeDate: futureDate })
        .build()
      ingredient.markEventsAsCommitted()

      // Act
      ingredient.notifyExpiringSoon(5)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(IngredientExpiringSoon)

      const event = events[0] as IngredientExpiringSoon
      expect(event.ingredientId).toBe(ingredient.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.ingredientName).toBe('期限間近の牛乳')
      expect(event.remainingDays).toBe(5)
    })

    it('期限切れの食材では期限切れ間近イベントを発行できない', () => {
      // 期限切れの食材を作成
      const pastDate = faker.date.past()
      const ingredient = new IngredientBuilder()
        .withExpiryInfo({ bestBeforeDate: pastDate })
        .build()
      ingredient.markEventsAsCommitted()

      // Act & Assert
      expect(() => ingredient.notifyExpiringSoon(0)).toThrow(
        '期限切れ間近の通知は期限内の食材のみ可能です'
      )
    })
  })

  describe('イベントの蓄積と管理', () => {
    it('複数の操作で複数のイベントが蓄積される', () => {
      // 複数の操作で複数のイベントが正しく蓄積されることを確認
      const userId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder().withUserId(userId).withQuantity(10).build()
      // ビルダーで作成した場合は作成イベントがないのでクリア不要

      // Act: 複数の操作を実行
      ingredient.consume(2)
      ingredient.replenish(5)
      ingredient.updateName(new IngredientName('新しい名前'), userId)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(3) // 消費 + 補充 + 更新
      expect(events[0]).toBeInstanceOf(StockConsumed)
      expect(events[1]).toBeInstanceOf(StockReplenished)
      expect(events[2]).toBeInstanceOf(IngredientUpdated)
    })

    it('イベントコミット後は新しいイベントのみ取得できる', () => {
      // イベントコミット後の動作を確認
      const userId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder().withUserId(userId).build()

      // 最初のイベント（作成）をコミット
      ingredient.markEventsAsCommitted()

      // Act: 新しい操作
      ingredient.consume(1)

      // Assert
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(StockConsumed)
    })
  })
})
