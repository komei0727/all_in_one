import { describe, it, expect } from 'vitest'

import { IngredientDeleted } from '@/modules/ingredients/server/domain/events/ingredient-deleted.event'

describe('IngredientDeleted イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで食材削除イベントを作成できる', () => {
      // 食材削除時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        ingredientName: 'トマト',
        categoryId: 'category-789',
        lastQuantity: 0,
        unitId: 'unit-001',
        reason: 'expired',
      }
      const metadata = {
        userId: 'user-456',
        correlationId: 'delete-789',
      }

      // Act
      const event = new IngredientDeleted(
        eventData.ingredientId,
        eventData.userId,
        eventData.ingredientName,
        eventData.categoryId,
        eventData.lastQuantity,
        eventData.unitId,
        eventData.reason,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('IngredientDeleted')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.userId).toBe(eventData.userId)
      expect(event.ingredientName).toBe(eventData.ingredientName)
      expect(event.categoryId).toBe(eventData.categoryId)
      expect(event.lastQuantity).toBe(eventData.lastQuantity)
      expect(event.unitId).toBe(eventData.unitId)
      expect(event.reason).toBe(eventData.reason)
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータなしで作成できる', () => {
      // メタデータなしでも作成できることを確認
      const event = new IngredientDeleted(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        0,
        'unit-001',
        'user-action'
      )

      // Assert
      expect(event.metadata).toEqual({})
    })

    it('理由なしで作成できる', () => {
      // 削除理由が省略されても作成できることを確認
      const event = new IngredientDeleted(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        0,
        'unit-001'
      )

      // Assert
      expect(event.reason).toBeUndefined()
    })
  })

  describe('JSON変換テスト', () => {
    it('toJSON()で適切な構造を返す', () => {
      // JSON変換が正しく行われることを確認
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        ingredientName: 'トマト',
        categoryId: 'category-789',
        lastQuantity: 2,
        unitId: 'unit-001',
        reason: 'expired',
      }
      const metadata = { userId: 'user-456' }

      const event = new IngredientDeleted(
        eventData.ingredientId,
        eventData.userId,
        eventData.ingredientName,
        eventData.categoryId,
        eventData.lastQuantity,
        eventData.unitId,
        eventData.reason,
        metadata
      )

      // Act
      const json = event.toJSON()

      // Assert
      expect(json).toMatchObject({
        eventName: 'IngredientDeleted',
        aggregateId: eventData.ingredientId,
        metadata: metadata,
        payload: {
          ingredientId: eventData.ingredientId,
          userId: eventData.userId,
          ingredientName: eventData.ingredientName,
          categoryId: eventData.categoryId,
          lastQuantity: eventData.lastQuantity,
          unitId: eventData.unitId,
          reason: eventData.reason,
        },
      })
      expect(json.id).toBeTruthy()
      expect(json.occurredAt).toBeTruthy()
      expect(json.version).toBe(1)
    })

    it('理由なしでもJSON変換できる', () => {
      // 理由が省略されてもJSON変換できることを確認
      const event = new IngredientDeleted(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        0,
        'unit-001'
      )

      const json = event.toJSON()

      // Assert
      expect((json.payload as any).reason).toBeUndefined()
    })
  })

  describe('イベントデータ検証テスト', () => {
    it('食材IDが空の場合はエラーになる', () => {
      // 必須データが不正な場合のエラーハンドリング
      expect(() => {
        new IngredientDeleted('', 'user-456', 'トマト', 'category-789', 0, 'unit-001')
      }).toThrow('食材IDは必須です')
    })

    it('ユーザーIDが空の場合はエラーになる', () => {
      expect(() => {
        new IngredientDeleted('ingredient-123', '', 'トマト', 'category-789', 0, 'unit-001')
      }).toThrow('ユーザーIDは必須です')
    })

    it('食材名が空の場合はエラーになる', () => {
      expect(() => {
        new IngredientDeleted('ingredient-123', 'user-456', '', 'category-789', 0, 'unit-001')
      }).toThrow('食材名は必須です')
    })

    it('カテゴリーIDが空の場合はエラーになる', () => {
      expect(() => {
        new IngredientDeleted('ingredient-123', 'user-456', 'トマト', '', 0, 'unit-001')
      }).toThrow('カテゴリーIDは必須です')
    })

    it('最終在庫量が負の値の場合はエラーになる', () => {
      expect(() => {
        new IngredientDeleted(
          'ingredient-123',
          'user-456',
          'トマト',
          'category-789',
          -1,
          'unit-001'
        )
      }).toThrow('最終在庫量は0以上である必要があります')
    })

    it('単位IDが空の場合はエラーになる', () => {
      expect(() => {
        new IngredientDeleted('ingredient-123', 'user-456', 'トマト', 'category-789', 0, '')
      }).toThrow('単位IDは必須です')
    })
  })

  describe('削除履歴・監査用データテスト', () => {
    it('削除履歴に必要な情報が含まれている', () => {
      // 削除履歴で必要とされる情報が含まれていることを確認
      const event = new IngredientDeleted(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        2,
        'unit-001',
        'expired',
        {
          userId: 'user-456',
          correlationId: 'deletion-tracking-123',
        }
      )

      const json = event.toJSON()

      // 削除履歴で必要な情報
      expect((json.payload as any).ingredientId).toBe('ingredient-123') // 削除された食材ID
      expect((json.payload as any).ingredientName).toBe('トマト') // 削除された食材名
      expect((json.payload as any).userId).toBe('user-456') // 削除実行者
      expect((json.payload as any).lastQuantity).toBe(2) // 削除時の在庫量
      expect((json.payload as any).reason).toBe('expired') // 削除理由
      expect(json.occurredAt).toBeTruthy() // 削除日時
    })

    it('廃棄統計に必要な情報が含まれている', () => {
      // 廃棄統計で必要な情報が含まれていることを確認
      const event = new IngredientDeleted(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        3,
        'unit-001',
        'expired'
      )

      const json = event.toJSON()

      // 廃棄統計で必要な情報
      expect((json.payload as any).categoryId).toBe('category-789') // カテゴリー別廃棄統計用
      expect((json.payload as any).lastQuantity).toBe(3) // 廃棄量統計用
      expect((json.payload as any).unitId).toBe('unit-001') // 廃棄量単位
      expect((json.payload as any).reason).toBe('expired') // 廃棄理由分析用
      expect(json.occurredAt).toBeTruthy() // 時系列分析用
    })

    it('削除理由別の分析データが含まれている', () => {
      // 削除理由別の分析で必要な情報が含まれていることを確認
      const reasons = ['expired', 'spoiled', 'user-action', 'system-cleanup']

      reasons.forEach((reason) => {
        const event = new IngredientDeleted(
          'ingredient-123',
          'user-456',
          'トマト',
          'category-789',
          1,
          'unit-001',
          reason
        )

        const json = event.toJSON()

        // 削除理由別分析データ
        expect((json.payload as any).reason).toBe(reason)
        expect((json.payload as any).lastQuantity).toBe(1)
        expect(json.occurredAt).toBeTruthy()
      })
    })

    it('復元可能性判定データが含まれている', () => {
      // データ復元の可能性判定で必要な情報が含まれていることを確認
      const event = new IngredientDeleted(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        0,
        'unit-001',
        'user-action',
        {
          userId: 'user-456',
          softDelete: true,
          retentionPeriod: 30,
        }
      )

      const json = event.toJSON()

      // 復元可能性判定データ
      expect((json.payload as any).reason).toBe('user-action') // 手動削除は復元可能
      expect((json.metadata as any).softDelete).toBe(true) // 論理削除フラグ
      expect((json.metadata as any).retentionPeriod).toBe(30) // 保持期間
      expect(json.occurredAt).toBeTruthy() // 削除日時（保持期間計算用）
    })
  })
})
