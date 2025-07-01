import { faker } from '@faker-js/faker/locale/ja'
import { describe, expect, it, beforeEach } from 'vitest'

import { ShoppingSession } from '@/modules/ingredients/server/domain/entities/shopping-session.entity'
import { BusinessRuleException } from '@/modules/ingredients/server/domain/exceptions'
import {
  ShoppingSessionId,
  SessionStatus,
  IngredientId,
  IngredientName,
  StockStatus,
  ExpiryStatus,
  DeviceType,
  ShoppingLocation,
} from '@/modules/ingredients/server/domain/value-objects'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders'

describe('ShoppingSession', () => {
  let userId: string
  let sessionId: ShoppingSessionId

  beforeEach(() => {
    userId = faker.string.uuid()
    sessionId = ShoppingSessionId.create()
  })

  describe('constructor', () => {
    it('必須項目のみで買い物セッションを作成できる', () => {
      // 新規セッションの作成
      const startedAt = new Date()
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        status: SessionStatus.ACTIVE,
        checkedItems: [],
      })

      // 基本的なプロパティの検証
      expect(session.getId()).toBe(sessionId)
      expect(session.getUserId()).toBe(userId)
      expect(session.getStartedAt()).toBe(startedAt)
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE)
      expect(session.getCheckedItems()).toEqual([])
      expect(session.getCompletedAt()).toBeNull()
    })

    it('完了済みセッションを作成できる', () => {
      // 完了済みセッションの作成
      const startedAt = faker.date.recent()
      const completedAt = faker.date.recent()
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        completedAt,
        status: SessionStatus.COMPLETED,
        checkedItems: [],
      })

      // プロパティの検証
      expect(session.getStatus()).toBe(SessionStatus.COMPLETED)
      expect(session.getCompletedAt()).toBe(completedAt)
    })
  })

  describe('ビルダーでの作成', () => {
    it('新しい買い物セッションを作成できる', () => {
      // ビルダーで新規セッション作成
      const session = new ShoppingSessionBuilder().withUserId(userId).build()

      // プロパティの検証
      expect(session.getId()).toBeInstanceOf(ShoppingSessionId)
      expect(session.getUserId()).toBe(userId)
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE)
      expect(session.getCheckedItems()).toEqual([])
      expect(session.getCompletedAt()).toBeNull()
    })
  })

  describe('checkItem', () => {
    it('アクティブなセッションで食材を確認できる', () => {
      // アクティブなセッションを作成
      const session = new ShoppingSessionBuilder().withUserId(userId).build()

      // 食材情報を準備
      const ingredientId = IngredientId.generate()
      const ingredientName = new IngredientName(faker.commerce.productName())
      const stockStatus = StockStatus.IN_STOCK
      const expiryStatus = ExpiryStatus.FRESH

      // 食材を確認
      session.checkItem({
        ingredientId,
        ingredientName,
        stockStatus,
        expiryStatus,
      })

      // 確認済みリストに追加されていることを検証
      const checkedItems = session.getCheckedItems()
      expect(checkedItems).toHaveLength(1)
      expect(checkedItems[0].getIngredientId()).toBe(ingredientId)
      expect(checkedItems[0].getIngredientName()).toBe(ingredientName)
      expect(checkedItems[0].getStockStatus()).toBe(stockStatus)
      expect(checkedItems[0].getExpiryStatus()).toBe(expiryStatus)
    })

    it('同じ食材を複数回確認すると最新の情報で更新される', () => {
      // アクティブなセッションを作成
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      const ingredientId = IngredientId.generate()
      const ingredientName = new IngredientName(faker.commerce.productName())

      // 1回目の確認（在庫あり）
      session.checkItem({
        ingredientId,
        ingredientName,
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // 2回目の確認（在庫少）
      session.checkItem({
        ingredientId,
        ingredientName,
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // 最新の情報で更新されていることを検証
      const checkedItems = session.getCheckedItems()
      expect(checkedItems).toHaveLength(1)
      expect(checkedItems[0].getIngredientId()).toBe(ingredientId)
      expect(checkedItems[0].getStockStatus()).toBe(StockStatus.LOW_STOCK)
    })

    it('完了済みセッションでは食材を確認できない', () => {
      // 完了済みセッションを作成
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: faker.date.recent(),
        completedAt: faker.date.recent(),
        status: SessionStatus.COMPLETED,
        checkedItems: [],
      })

      // 食材確認を試みる
      expect(() => {
        session.checkItem({
          ingredientId: IngredientId.generate(),
          ingredientName: new IngredientName(faker.commerce.productName()),
          stockStatus: StockStatus.IN_STOCK,
          expiryStatus: ExpiryStatus.FRESH,
        })
      }).toThrow(BusinessRuleException)
      expect(() => {
        session.checkItem({
          ingredientId: IngredientId.generate(),
          ingredientName: new IngredientName(faker.commerce.productName()),
          stockStatus: StockStatus.IN_STOCK,
          expiryStatus: ExpiryStatus.FRESH,
        })
      }).toThrow('アクティブでないセッションでは食材を確認できません')
    })
  })

  describe('complete', () => {
    it('アクティブなセッションを完了できる', () => {
      // アクティブなセッションを作成
      const session = new ShoppingSessionBuilder().withUserId(userId).build()

      // セッションを完了
      session.complete()

      // 状態が更新されていることを検証
      expect(session.getStatus()).toBe(SessionStatus.COMPLETED)
      expect(session.getCompletedAt()).not.toBeNull()
    })

    it('既に完了しているセッションは再度完了できない', () => {
      // アクティブなセッションを作成して完了
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      session.complete()

      // 再度完了を試みる
      expect(() => session.complete()).toThrow(BusinessRuleException)
      expect(() => session.complete()).toThrow('アクティブでないセッションは完了できません')
    })
  })

  describe('abandon', () => {
    it('アクティブなセッションを中断できる', () => {
      // アクティブなセッションを作成
      const session = new ShoppingSessionBuilder().withUserId(userId).build()

      // セッションを中断
      session.abandon()

      // 状態が更新されていることを検証
      expect(session.getStatus()).toBe(SessionStatus.ABANDONED)
      expect(session.getCompletedAt()).not.toBeNull()
    })

    it('既に完了しているセッションは中断できない', () => {
      // アクティブなセッションを作成して完了
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      session.complete()

      // 中断を試みる
      expect(() => session.abandon()).toThrow(BusinessRuleException)
      expect(() => session.abandon()).toThrow('アクティブでないセッションは中断できません')
    })
  })

  describe('getDuration', () => {
    it('セッションの継続時間を取得できる', () => {
      // 5分前に開始したセッションを作成
      const startedAt = new Date()
      startedAt.setMinutes(startedAt.getMinutes() - 5)

      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        status: SessionStatus.ACTIVE,
        checkedItems: [],
      })

      // 継続時間が正しく計算されることを検証（約5分）
      const duration = session.getDuration()
      expect(duration).toBeGreaterThan(4 * 60 * 1000) // 4分以上
      expect(duration).toBeLessThan(6 * 60 * 1000) // 6分以下
    })

    it('完了済みセッションは開始から完了までの時間を返す', () => {
      // 開始と完了の時刻を設定
      const startedAt = new Date()
      startedAt.setMinutes(startedAt.getMinutes() - 10)
      const completedAt = new Date()
      completedAt.setMinutes(completedAt.getMinutes() - 5)

      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        completedAt,
        status: SessionStatus.COMPLETED,
        checkedItems: [],
      })

      // 継続時間が正しく計算されることを検証（約5分）
      const duration = session.getDuration()
      const expectedDuration = completedAt.getTime() - startedAt.getTime()
      expect(duration).toBe(expectedDuration)
    })
  })

  describe('isActive', () => {
    it('アクティブなセッションはtrueを返す', () => {
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      expect(session.isActive()).toBe(true)
    })

    it('完了済みセッションはfalseを返す', () => {
      const session = new ShoppingSessionBuilder().withUserId(userId).build()
      session.complete()
      expect(session.isActive()).toBe(false)
    })
  })

  describe('getCheckedItemsCount', () => {
    it('確認済み食材の数を取得できる', () => {
      const session = new ShoppingSessionBuilder().withUserId(userId).build()

      // 複数の食材を確認
      for (let i = 0; i < 3; i++) {
        session.checkItem({
          ingredientId: IngredientId.generate(),
          ingredientName: new IngredientName(faker.commerce.productName()),
          stockStatus: StockStatus.IN_STOCK,
          expiryStatus: ExpiryStatus.FRESH,
        })
      }

      expect(session.getCheckedItemsCount()).toBe(3)
    })
  })

  describe('getNeedsAttentionItems', () => {
    it('注意が必要な食材のみを取得できる', () => {
      const session = new ShoppingSessionBuilder().withUserId(userId).build()

      // 通常の食材
      session.checkItem({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName('新鮮な野菜'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // 在庫少の食材
      session.checkItem({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName('在庫少の調味料'),
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // 期限切れ間近の食材
      session.checkItem({
        ingredientId: IngredientId.generate(),
        ingredientName: new IngredientName('期限切れ間近の牛乳'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.EXPIRING_SOON,
      })

      // 注意が必要な食材は2つ
      const needsAttentionItems = session.getNeedsAttentionItems()
      expect(needsAttentionItems).toHaveLength(2)
      expect(needsAttentionItems[0].getIngredientName().getValue()).toBe('在庫少の調味料')
      expect(needsAttentionItems[1].getIngredientName().getValue()).toBe('期限切れ間近の牛乳')
    })
  })

  describe('deviceType and location', () => {
    it('deviceTypeとlocationを指定してセッションを作成できる', () => {
      // Given
      const startedAt = new Date()
      const deviceType = DeviceType.MOBILE
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // When
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        deviceType,
        location,
      })

      // Then
      expect(session.getDeviceType()).toBe(deviceType)
      expect(session.getLocation()).toBe(location)
    })

    it('deviceTypeのみ指定してセッションを作成できる', () => {
      // Given
      const startedAt = new Date()
      const deviceType = DeviceType.TABLET

      // When
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        deviceType,
      })

      // Then
      expect(session.getDeviceType()).toBe(deviceType)
      expect(session.getLocation()).toBeNull()
    })

    it('locationのみ指定してセッションを作成できる', () => {
      // Given
      const startedAt = new Date()
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      // When
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        location,
      })

      // Then
      expect(session.getDeviceType()).toBeNull()
      expect(session.getLocation()).toBe(location)
    })

    it('deviceTypeとlocationなしでセッションを作成できる', () => {
      // Given
      const startedAt = new Date()

      // When
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt,
        status: SessionStatus.ACTIVE,
        checkedItems: [],
      })

      // Then
      expect(session.getDeviceType()).toBeNull()
      expect(session.getLocation()).toBeNull()
    })

    it('モバイルデバイスの場合はisUsingMobileDevice()がtrueを返す', () => {
      // Given
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        deviceType: DeviceType.MOBILE,
      })

      // When & Then
      expect(session.isUsingMobileDevice()).toBe(true)
    })

    it('タブレットの場合はisUsingMobileDevice()がfalseを返す', () => {
      // Given
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        deviceType: DeviceType.TABLET,
      })

      // When & Then
      expect(session.isUsingMobileDevice()).toBe(false)
    })

    it('deviceTypeが未設定の場合はisUsingMobileDevice()がfalseを返す', () => {
      // Given
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
      })

      // When & Then
      expect(session.isUsingMobileDevice()).toBe(false)
    })

    it('位置情報が設定されている場合はhasLocation()がtrueを返す', () => {
      // Given
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        location,
      })

      // When & Then
      expect(session.hasLocation()).toBe(true)
    })

    it('位置情報が未設定の場合はhasLocation()がfalseを返す', () => {
      // Given
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
      })

      // When & Then
      expect(session.hasLocation()).toBe(false)
    })

    it('位置情報に名前が設定されている場合はgetLocationName()で名前を取得できる', () => {
      // Given
      const locationName = '東京駅前スーパー'
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: locationName,
      })
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        location,
      })

      // When & Then
      expect(session.getLocationName()).toBe(locationName)
    })

    it('位置情報に名前が設定されていない場合はgetLocationName()がnullを返す', () => {
      // Given
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
        location,
      })

      // When & Then
      expect(session.getLocationName()).toBeNull()
    })

    it('位置情報が未設定の場合はgetLocationName()がnullを返す', () => {
      // Given
      const session = new ShoppingSession({
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: SessionStatus.ACTIVE,
        checkedItems: [],
      })

      // When & Then
      expect(session.getLocationName()).toBeNull()
    })
  })
})
