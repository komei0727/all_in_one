import { describe, it, expect } from 'vitest'

import { IngredientCreated } from '@/modules/ingredients/server/domain/events/ingredient-created.event'

describe('IngredientCreated イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで食材作成イベントを作成できる', () => {
      // 食材作成時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        ingredientName: 'トマト',
        categoryId: 'category-789',
        initialQuantity: 5,
        unitId: 'unit-001',
      }
      const metadata = {
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      }

      // Act
      const event = new IngredientCreated(
        eventData.ingredientId,
        eventData.userId,
        eventData.ingredientName,
        eventData.categoryId,
        eventData.initialQuantity,
        eventData.unitId,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('IngredientCreated')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.userId).toBe(eventData.userId)
      expect(event.ingredientName).toBe(eventData.ingredientName)
      expect(event.categoryId).toBe(eventData.categoryId)
      expect(event.initialQuantity).toBe(eventData.initialQuantity)
      expect(event.unitId).toBe(eventData.unitId)
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータなしで作成できる', () => {
      // メタデータなしでも作成できることを確認
      const event = new IngredientCreated(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        3,
        'unit-001'
      )

      // Assert
      expect(event.metadata).toEqual({})
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
        initialQuantity: 5,
        unitId: 'unit-001',
      }
      const metadata = { userId: 'user-456' }

      const event = new IngredientCreated(
        eventData.ingredientId,
        eventData.userId,
        eventData.ingredientName,
        eventData.categoryId,
        eventData.initialQuantity,
        eventData.unitId,
        metadata
      )

      // Act
      const json = event.toJSON()

      // Assert
      expect(json).toMatchObject({
        eventName: 'IngredientCreated',
        aggregateId: eventData.ingredientId,
        metadata: metadata,
        payload: {
          ingredientId: eventData.ingredientId,
          userId: eventData.userId,
          ingredientName: eventData.ingredientName,
          categoryId: eventData.categoryId,
          initialQuantity: eventData.initialQuantity,
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
      expect(() => {
        new IngredientCreated('', 'user-456', 'トマト', 'category-789', 3, 'unit-001')
      }).toThrow('食材IDは必須です')
    })

    it('ユーザーIDが空の場合はエラーになる', () => {
      expect(() => {
        new IngredientCreated('ingredient-123', '', 'トマト', 'category-789', 3, 'unit-001')
      }).toThrow('ユーザーIDは必須です')
    })

    it('食材名が空の場合はエラーになる', () => {
      expect(() => {
        new IngredientCreated('ingredient-123', 'user-456', '', 'category-789', 3, 'unit-001')
      }).toThrow('食材名は必須です')
    })

    it('初期数量が0以下の場合はエラーになる', () => {
      expect(() => {
        new IngredientCreated('ingredient-123', 'user-456', 'トマト', 'category-789', 0, 'unit-001')
      }).toThrow('初期数量は0より大きい必要があります')

      expect(() => {
        new IngredientCreated(
          'ingredient-123',
          'user-456',
          'トマト',
          'category-789',
          -1,
          'unit-001'
        )
      }).toThrow('初期数量は0より大きい必要があります')
    })
  })

  describe('監査ログ・統計用データテスト', () => {
    it('監査ログに必要な情報が含まれている', () => {
      // 監査ログで必要とされる情報が含まれていることを確認
      const event = new IngredientCreated(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        5,
        'unit-001',
        {
          userId: 'user-456',
          ipAddress: '192.168.1.1',
          correlationId: 'correlation-123',
        }
      )

      const json = event.toJSON()

      // 監査ログで必要な情報
      expect(json.id).toBeTruthy() // イベントID
      expect(json.occurredAt).toBeTruthy() // 発生時刻
      expect((json.payload as any).userId).toBe('user-456') // 実行者
      expect((json.payload as any).ingredientId).toBe('ingredient-123') // 対象
      expect((json.metadata as any).ipAddress).toBe('192.168.1.1') // アクセス元
      expect((json.metadata as any).correlationId).toBe('correlation-123') // 相関ID
    })

    it('統計分析に必要な情報が含まれている', () => {
      // 統計分析で必要な情報が含まれていることを確認
      const event = new IngredientCreated(
        'ingredient-123',
        'user-456',
        'トマト',
        'category-789',
        5,
        'unit-001'
      )

      const json = event.toJSON()

      // 統計分析で必要な情報
      expect((json.payload as any).categoryId).toBe('category-789') // カテゴリー別統計用
      expect((json.payload as any).initialQuantity).toBe(5) // 数量統計用
      expect((json.payload as any).unitId).toBe('unit-001') // 単位別統計用
      expect(json.occurredAt).toBeTruthy() // 時系列分析用
    })
  })
})
