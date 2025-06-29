import { describe, expect, it } from 'vitest'

import {
  ShoppingSessionStarted,
  ItemChecked,
  ShoppingSessionCompleted,
  ShoppingSessionAbandoned,
} from '@/modules/ingredients/server/domain/events'
import {
  IngredientId,
  IngredientName,
  StockStatus,
  ExpiryStatus,
} from '@/modules/ingredients/server/domain/value-objects'

import { ShoppingSessionBuilder, testDataHelpers } from '../../../../../../__fixtures__/builders'

describe('ShoppingSession ドメインイベント発行', () => {
  describe('セッション開始イベント', () => {
    it('新規作成フラグがtrueの場合、ShoppingSessionStartedイベントを発行する', () => {
      // 新規作成フラグを設定してエンティティを作成
      const userId = testDataHelpers.userId()
      const session = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withIsNew(true) // 新規作成フラグを設定
        .build()

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(ShoppingSessionStarted)

      const event = events[0] as ShoppingSessionStarted
      expect(event.sessionId).toBe(session.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.startedAt).toEqual(session.getStartedAt())
    })

    it('新規作成フラグがfalseの場合、ShoppingSessionStartedイベントを発行しない', () => {
      // 既存エンティティとして作成（デフォルト動作）
      const session = new ShoppingSessionBuilder().build()

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(0)
    })
  })

  describe('食材確認イベント', () => {
    it('食材確認時にItemCheckedイベントを発行する', () => {
      // セッションを作成
      const userId = testDataHelpers.userId()
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      session.markEventsAsCommitted() // 作成イベントをクリア

      // 食材情報を準備
      const ingredientId = IngredientId.generate()
      const ingredientName = new IngredientName(testDataHelpers.ingredientName())
      const stockStatus = StockStatus.IN_STOCK
      const expiryStatus = ExpiryStatus.FRESH

      // Act
      session.checkItem({
        ingredientId,
        ingredientName,
        stockStatus,
        expiryStatus,
      })

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(ItemChecked)

      const event = events[0] as ItemChecked
      expect(event.sessionId).toBe(session.getId().getValue())
      expect(event.ingredientId).toBe(ingredientId.getValue())
      expect(event.ingredientName).toBe(ingredientName.getValue())
      expect(event.stockStatus).toBe(stockStatus.getValue())
      expect(event.expiryStatus).toBe(expiryStatus.getValue())
    })

    it('同じ食材を再確認してもイベントを発行する', () => {
      // セッションを作成
      const session = new ShoppingSessionBuilder().build()
      session.markEventsAsCommitted()

      const ingredientId = IngredientId.generate()
      const ingredientName = new IngredientName(testDataHelpers.ingredientName())

      // 1回目の確認
      session.checkItem({
        ingredientId,
        ingredientName,
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })
      session.markEventsAsCommitted()

      // Act: 2回目の確認（在庫状態が変更）
      session.checkItem({
        ingredientId,
        ingredientName,
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(1)
      const event = events[0] as ItemChecked
      expect(event.stockStatus).toBe(StockStatus.LOW_STOCK.getValue())
    })
  })

  describe('セッション完了イベント', () => {
    it('セッション完了時にShoppingSessionCompletedイベントを発行する', () => {
      // セッションを作成し、いくつかの食材を確認
      const userId = testDataHelpers.userId()
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      session.markEventsAsCommitted()

      // 食材を確認
      for (let i = 0; i < 3; i++) {
        session.checkItem({
          ingredientId: IngredientId.generate(),
          ingredientName: new IngredientName(testDataHelpers.ingredientName()),
          stockStatus: StockStatus.IN_STOCK,
          expiryStatus: ExpiryStatus.FRESH,
        })
      }
      session.markEventsAsCommitted()

      // Act
      session.complete()

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(ShoppingSessionCompleted)

      const event = events[0] as ShoppingSessionCompleted
      expect(event.sessionId).toBe(session.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.durationMs).toBeGreaterThanOrEqual(0)
      expect(event.checkedItemsCount).toBe(3)
    })
  })

  describe('セッション中断イベント', () => {
    it('セッション中断時にShoppingSessionAbandonedイベントを発行する', () => {
      // セッションを作成
      const userId = testDataHelpers.userId()
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      session.markEventsAsCommitted()

      // Act
      const reason = 'タイムアウト'
      session.abandon(reason)

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(ShoppingSessionAbandoned)

      const event = events[0] as ShoppingSessionAbandoned
      expect(event.sessionId).toBe(session.getId().getValue())
      expect(event.userId).toBe(userId)
      expect(event.durationMs).toBeGreaterThanOrEqual(0)
      expect(event.reason).toBe(reason)
    })

    it('理由なしで中断する場合はデフォルト理由を使用する', () => {
      // セッションを作成
      const session = new ShoppingSessionBuilder().build()
      session.markEventsAsCommitted()

      // Act
      session.abandon()

      // Assert
      const events = session.getUncommittedEvents()
      const event = events[0] as ShoppingSessionAbandoned
      expect(event.reason).toBe('user-action')
    })
  })

  describe('イベントの蓄積と管理', () => {
    it('複数の操作で複数のイベントが蓄積される', () => {
      // セッションを新規作成（開始イベント）
      const userId = testDataHelpers.userId()
      const session = new ShoppingSessionBuilder().withUserId(userId).withIsNew(true).build()

      // 食材を確認（確認イベント）
      session.checkItem({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(testDataHelpers.ingredientName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // セッションを完了（完了イベント）
      session.complete()

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(3) // 開始 + 確認 + 完了
      expect(events[0]).toBeInstanceOf(ShoppingSessionStarted)
      expect(events[1]).toBeInstanceOf(ItemChecked)
      expect(events[2]).toBeInstanceOf(ShoppingSessionCompleted)
    })

    it('イベントコミット後は新しいイベントのみ取得できる', () => {
      // セッションを作成
      const session = new ShoppingSessionBuilder().withIsNew(true).build()

      // 最初のイベント（開始）をコミット
      session.markEventsAsCommitted()

      // Act: 新しい操作
      session.checkItem({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName(testDataHelpers.ingredientName()),
        stockStatus: StockStatus.OUT_OF_STOCK,
        expiryStatus: ExpiryStatus.EXPIRED,
      })

      // Assert
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(ItemChecked)
    })
  })
})
