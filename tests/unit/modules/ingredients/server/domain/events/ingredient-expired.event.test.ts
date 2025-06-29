import { describe, it, expect } from 'vitest'

import { IngredientExpired } from '@/modules/ingredients/server/domain/events/ingredient-expired.event'

describe('IngredientExpired イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで食材期限切れイベントを作成できる', () => {
      // 期限切れ検知時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        ingredientName: 'トマト',
        categoryId: 'category-789',
        expiredDate: new Date('2024-01-15'),
        remainingDays: -3,
        remainingQuantity: 2,
        unitId: 'unit-001',
      }
      const metadata = {
        systemCheck: true,
        batchId: 'expiry-check-20240118',
        correlationId: 'expiry-correlation-456',
      }

      // Act
      const event = new IngredientExpired(
        eventData.ingredientId,
        eventData.ingredientName,
        eventData.categoryId,
        eventData.expiredDate,
        eventData.remainingDays,
        eventData.remainingQuantity,
        eventData.unitId,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('IngredientExpired')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.ingredientName).toBe(eventData.ingredientName)
      expect(event.categoryId).toBe(eventData.categoryId)
      expect(event.expiredDate).toEqual(eventData.expiredDate)
      expect(event.remainingDays).toBe(eventData.remainingDays)
      expect(event.remainingQuantity).toBe(eventData.remainingQuantity)
      expect(event.unitId).toBe(eventData.unitId)
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータなしで作成できる', () => {
      // メタデータなしでも作成できることを確認
      const expiredDate = new Date('2024-01-15')
      const event = new IngredientExpired(
        'ingredient-123',
        'トマト',
        'category-789',
        expiredDate,
        -3,
        2,
        'unit-001'
      )

      // Assert
      expect(event.metadata).toEqual({})
    })

    it('期限切れ直前（remainingDays = 0）でもイベントを作成できる', () => {
      // 当日期限切れのケース
      const expiredDate = new Date('2024-01-18')
      const event = new IngredientExpired(
        'ingredient-123',
        'トマト',
        'category-789',
        expiredDate,
        0,
        2,
        'unit-001'
      )

      // Assert
      expect(event.remainingDays).toBe(0)
    })
  })

  describe('JSON変換テスト', () => {
    it('toJSON()で適切な構造を返す', () => {
      // JSON変換が正しく行われることを確認
      const eventData = {
        ingredientId: 'ingredient-123',
        ingredientName: 'トマト',
        categoryId: 'category-789',
        expiredDate: new Date('2024-01-15'),
        remainingDays: -3,
        remainingQuantity: 2,
        unitId: 'unit-001',
      }
      const metadata = { systemCheck: true }

      const event = new IngredientExpired(
        eventData.ingredientId,
        eventData.ingredientName,
        eventData.categoryId,
        eventData.expiredDate,
        eventData.remainingDays,
        eventData.remainingQuantity,
        eventData.unitId,
        metadata
      )

      // Act
      const json = event.toJSON()

      // Assert
      expect(json).toMatchObject({
        eventName: 'IngredientExpired',
        aggregateId: eventData.ingredientId,
        metadata: metadata,
        payload: {
          ingredientId: eventData.ingredientId,
          ingredientName: eventData.ingredientName,
          categoryId: eventData.categoryId,
          expiredDate: eventData.expiredDate.toISOString(),
          remainingDays: eventData.remainingDays,
          remainingQuantity: eventData.remainingQuantity,
          unitId: eventData.unitId,
        },
      })
      expect(json.id).toBeTruthy()
      expect(json.occurredAt).toBeTruthy()
      expect(json.version).toBe(1)
    })
  })

  describe('イベントデータ検証テスト', () => {
    it('食材IDが空の場合はエラーになる', () => {
      // 必須データが不正な場合のエラーハンドリング
      const expiredDate = new Date('2024-01-15')
      expect(() => {
        new IngredientExpired('', 'トマト', 'category-789', expiredDate, -3, 2, 'unit-001')
      }).toThrow('食材IDは必須です')
    })

    it('食材名が空の場合はエラーになる', () => {
      const expiredDate = new Date('2024-01-15')
      expect(() => {
        new IngredientExpired('ingredient-123', '', 'category-789', expiredDate, -3, 2, 'unit-001')
      }).toThrow('食材名は必須です')
    })

    it('カテゴリーIDが空の場合はエラーになる', () => {
      const expiredDate = new Date('2024-01-15')
      expect(() => {
        new IngredientExpired('ingredient-123', 'トマト', '', expiredDate, -3, 2, 'unit-001')
      }).toThrow('カテゴリーIDは必須です')
    })

    it('期限日が未来すぎる場合はエラーになる', () => {
      // 1年以上先の日付は異常値として扱う
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)

      expect(() => {
        new IngredientExpired(
          'ingredient-123',
          'トマト',
          'category-789',
          futureDate,
          -3,
          2,
          'unit-001'
        )
      }).toThrow('期限日が異常です')
    })

    it('残り数量が負の値の場合はエラーになる', () => {
      const expiredDate = new Date('2024-01-15')
      expect(() => {
        new IngredientExpired(
          'ingredient-123',
          'トマト',
          'category-789',
          expiredDate,
          -3,
          -1,
          'unit-001'
        )
      }).toThrow('残り数量は0以上である必要があります')
    })

    it('単位IDが空の場合はエラーになる', () => {
      const expiredDate = new Date('2024-01-15')
      expect(() => {
        new IngredientExpired('ingredient-123', 'トマト', 'category-789', expiredDate, -3, 2, '')
      }).toThrow('単位IDは必須です')
    })
  })

  describe('期限切れ通知・廃棄管理用データテスト', () => {
    it('期限切れ通知に必要な情報が含まれている', () => {
      // 期限切れ通知で必要とされる情報が含まれていることを確認
      const expiredDate = new Date('2024-01-15')
      const event = new IngredientExpired(
        'ingredient-123',
        'トマト',
        'category-789',
        expiredDate,
        -3,
        2,
        'unit-001',
        {
          systemCheck: true,
          notificationSent: false,
        }
      )

      const json = event.toJSON()

      // 期限切れ通知で必要な情報
      expect((json.payload as any).ingredientName).toBe('トマト') // 通知対象食材名
      expect((json.payload as any).expiredDate).toBe(expiredDate.toISOString()) // 期限日
      expect((json.payload as any).remainingDays).toBe(-3) // 経過日数
      expect((json.payload as any).remainingQuantity).toBe(2) // 残量
      expect((json.payload as any).unitId).toBe('unit-001') // 単位情報
      expect(json.occurredAt).toBeTruthy() // 検知日時
    })

    it('廃棄管理に必要な情報が含まれている', () => {
      // 廃棄管理で必要な情報が含まれていることを確認
      const expiredDate = new Date('2024-01-15')
      const event = new IngredientExpired(
        'ingredient-123',
        'トマト',
        'category-789',
        expiredDate,
        -5,
        3,
        'unit-001'
      )

      const json = event.toJSON()

      // 廃棄管理で必要な情報
      expect((json.payload as any).ingredientId).toBe('ingredient-123') // 廃棄対象特定用
      expect((json.payload as any).categoryId).toBe('category-789') // カテゴリー別廃棄統計用
      expect((json.payload as any).remainingQuantity).toBe(3) // 廃棄予定量
      expect((json.payload as any).unitId).toBe('unit-001') // 廃棄量単位
      expect(json.occurredAt).toBeTruthy() // 廃棄記録日時
    })

    it('期限切れ分析に必要な情報が含まれている', () => {
      // 期限切れパターン分析で必要な情報が含まれていることを確認
      const expiredDate = new Date('2024-01-15')
      const event = new IngredientExpired(
        'ingredient-123',
        'トマト',
        'category-789',
        expiredDate,
        -7,
        1,
        'unit-001'
      )

      const json = event.toJSON()

      // 期限切れ分析で必要な情報
      expect((json.payload as any).categoryId).toBe('category-789') // カテゴリー別分析用
      expect((json.payload as any).remainingDays).toBe(-7) // 期限切れ傾向分析用
      expect((json.payload as any).remainingQuantity).toBe(1) // 無駄量分析用
      expect(json.occurredAt).toBeTruthy() // 時系列分析用
    })

    it('在庫警告システム連携に必要な情報が含まれている', () => {
      // 在庫警告システムとの連携で必要な情報が含まれていることを確認
      const expiredDate = new Date('2024-01-15')
      const event = new IngredientExpired(
        'ingredient-123',
        'トマト',
        'category-789',
        expiredDate,
        0, // 当日期限切れ
        0, // 在庫なし
        'unit-001',
        {
          urgency: 'high',
          autoReorderEligible: true,
        }
      )

      const json = event.toJSON()

      // 在庫警告システム連携で必要な情報
      expect((json.payload as any).remainingQuantity).toBe(0) // 在庫切れ判定用
      expect((json.payload as any).remainingDays).toBe(0) // 緊急度判定用
      expect((json.payload as any).ingredientId).toBe('ingredient-123') // 補充対象特定用
      expect((json.metadata as any).urgency).toBe('high') // 緊急度情報
      expect((json.metadata as any).autoReorderEligible).toBe(true) // 自動補充可否
    })
  })
})
