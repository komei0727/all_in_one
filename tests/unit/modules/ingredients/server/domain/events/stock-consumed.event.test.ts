import { describe, it, expect } from 'vitest'
import { StockConsumed } from '@/modules/ingredients/server/domain/events/stock-consumed.event'

describe('StockConsumed イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで在庫消費イベントを作成できる', () => {
      // 在庫消費時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        consumedAmount: 2,
        remainingAmount: 3,
        unitId: 'unit-001',
      }
      const metadata = {
        userId: 'user-456',
        correlationId: 'correlation-789',
      }

      // Act
      const event = new StockConsumed(
        eventData.ingredientId,
        eventData.userId,
        eventData.consumedAmount,
        eventData.remainingAmount,
        eventData.unitId,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('StockConsumed')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.userId).toBe(eventData.userId)
      expect(event.consumedAmount).toBe(eventData.consumedAmount)
      expect(event.remainingAmount).toBe(eventData.remainingAmount)
      expect(event.unitId).toBe(eventData.unitId)
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータなしで作成できる', () => {
      // メタデータなしでも作成できることを確認
      const event = new StockConsumed('ingredient-123', 'user-456', 2, 3, 'unit-001')

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
        consumedAmount: 2,
        remainingAmount: 3,
        unitId: 'unit-001',
      }
      const metadata = { userId: 'user-456' }

      const event = new StockConsumed(
        eventData.ingredientId,
        eventData.userId,
        eventData.consumedAmount,
        eventData.remainingAmount,
        eventData.unitId,
        metadata
      )

      // Act
      const json = event.toJSON()

      // Assert
      expect(json).toMatchObject({
        eventName: 'StockConsumed',
        aggregateId: eventData.ingredientId,
        metadata: metadata,
        payload: {
          ingredientId: eventData.ingredientId,
          userId: eventData.userId,
          consumedAmount: eventData.consumedAmount,
          remainingAmount: eventData.remainingAmount,
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
        new StockConsumed('', 'user-456', 2, 3, 'unit-001')
      }).toThrow('食材IDは必須です')
    })

    it('ユーザーIDが空の場合はエラーになる', () => {
      expect(() => {
        new StockConsumed('ingredient-123', '', 2, 3, 'unit-001')
      }).toThrow('ユーザーIDは必須です')
    })

    it('消費量が0以下の場合はエラーになる', () => {
      expect(() => {
        new StockConsumed('ingredient-123', 'user-456', 0, 3, 'unit-001')
      }).toThrow('消費量は0より大きい必要があります')

      expect(() => {
        new StockConsumed('ingredient-123', 'user-456', -1, 3, 'unit-001')
      }).toThrow('消費量は0より大きい必要があります')
    })

    it('残量が0未満の場合はエラーになる', () => {
      expect(() => {
        new StockConsumed('ingredient-123', 'user-456', 2, -1, 'unit-001')
      }).toThrow('残量は0以上である必要があります')
    })

    it('単位IDが空の場合はエラーになる', () => {
      expect(() => {
        new StockConsumed('ingredient-123', 'user-456', 2, 3, '')
      }).toThrow('単位IDは必須です')
    })
  })

  describe('消費履歴・分析用データテスト', () => {
    it('消費履歴に必要な情報が含まれている', () => {
      // 消費履歴で必要とされる情報が含まれていることを確認
      const event = new StockConsumed('ingredient-123', 'user-456', 2, 3, 'unit-001', {
        userId: 'user-456',
        correlationId: 'consumption-tracking-123',
      })

      const json = event.toJSON()

      // 消費履歴で必要な情報
      expect(json.payload.ingredientId).toBe('ingredient-123') // 対象食材
      expect(json.payload.userId).toBe('user-456') // 消費者
      expect(json.payload.consumedAmount).toBe(2) // 消費量
      expect(json.payload.remainingAmount).toBe(3) // 残量
      expect(json.payload.unitId).toBe('unit-001') // 単位
      expect(json.occurredAt).toBeTruthy() // 消費日時
    })

    it('消費パターン分析に必要な情報が含まれている', () => {
      // 消費パターン分析で必要な情報が含まれていることを確認
      const event = new StockConsumed('ingredient-123', 'user-456', 2, 3, 'unit-001')

      const json = event.toJSON()

      // 消費パターン分析で必要な情報
      expect(json.payload.consumedAmount).toBe(2) // 消費量分析用
      expect(json.payload.remainingAmount).toBe(3) // 在庫推移分析用
      expect(json.occurredAt).toBeTruthy() // 時系列分析用
      expect(json.payload.userId).toBe('user-456') // ユーザー別分析用
    })

    it('在庫切れ判定に必要な情報が含まれている', () => {
      // 在庫切れ検知で必要な情報が含まれていることを確認
      const event = new StockConsumed(
        'ingredient-123',
        'user-456',
        5,
        0, // 在庫切れ
        'unit-001'
      )

      const json = event.toJSON()

      // 在庫切れ判定で必要な情報
      expect(json.payload.remainingAmount).toBe(0) // 残量チェック用
      expect(json.payload.ingredientId).toBe('ingredient-123') // 対象食材特定用
    })
  })
})
