import { describe, it, expect } from 'vitest'

import { StockLevelLow } from '@/modules/ingredients/server/domain/events/stock-level-low.event'

describe('StockLevelLow イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで在庫少量警告イベントを作成できる', () => {
      // 在庫少量警告時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        ingredientName: 'トマト',
        currentQuantity: 1,
        thresholdQuantity: 3,
        unitId: 'unit-001',
        urgencyLevel: 'medium',
      }
      const metadata = {
        systemCheck: true,
        alertRule: 'stock-threshold-check',
      }

      // Act
      const event = new StockLevelLow(
        eventData.ingredientId,
        eventData.ingredientName,
        eventData.currentQuantity,
        eventData.thresholdQuantity,
        eventData.unitId,
        eventData.urgencyLevel,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('StockLevelLow')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.ingredientName).toBe(eventData.ingredientName)
      expect(event.currentQuantity).toBe(eventData.currentQuantity)
      expect(event.thresholdQuantity).toBe(eventData.thresholdQuantity)
      expect(event.unitId).toBe(eventData.unitId)
      expect(event.urgencyLevel).toBe(eventData.urgencyLevel)
      expect(event.metadata).toEqual(metadata)
    })

    it('緊急度なしで作成できる', () => {
      const event = new StockLevelLow('ingredient-123', 'トマト', 1, 3, 'unit-001')

      expect(event.urgencyLevel).toBeUndefined()
    })
  })

  describe('イベントデータ検証テスト', () => {
    it('現在数量が閾値以上の場合はエラーになる', () => {
      // 在庫少量警告なのに数量が閾値以上の場合はエラー
      expect(() => {
        new StockLevelLow('ingredient-123', 'トマト', 5, 3, 'unit-001')
      }).toThrow('現在数量が閾値以下である必要があります')
    })

    it('現在数量が負の値の場合はエラーになる', () => {
      expect(() => {
        new StockLevelLow('ingredient-123', 'トマト', -1, 3, 'unit-001')
      }).toThrow('現在数量は0以上である必要があります')
    })

    it('食材IDが空の場合はエラーになる', () => {
      expect(() => {
        new StockLevelLow('', 'トマト', 1, 3, 'unit-001')
      }).toThrow('食材IDは必須です')
    })

    it('食材IDが空白文字のみの場合はエラーになる', () => {
      expect(() => {
        new StockLevelLow('   ', 'トマト', 1, 3, 'unit-001')
      }).toThrow('食材IDは必須です')
    })

    it('食材名が空の場合はエラーになる', () => {
      expect(() => {
        new StockLevelLow('ingredient-123', '', 1, 3, 'unit-001')
      }).toThrow('食材名は必須です')
    })

    it('食材名が空白文字のみの場合はエラーになる', () => {
      expect(() => {
        new StockLevelLow('ingredient-123', '   ', 1, 3, 'unit-001')
      }).toThrow('食材名は必須です')
    })

    it('単位IDが空の場合はエラーになる', () => {
      expect(() => {
        new StockLevelLow('ingredient-123', 'トマト', 1, 3, '')
      }).toThrow('単位IDは必須です')
    })

    it('単位IDが空白文字のみの場合はエラーになる', () => {
      expect(() => {
        new StockLevelLow('ingredient-123', 'トマト', 1, 3, '   ')
      }).toThrow('単位IDは必須です')
    })
  })

  describe('getPayload メソッド', () => {
    it('緊急度レベルが指定されている場合はペイロードに含まれる', () => {
      const event = new StockLevelLow('ingredient-123', 'トマト', 1, 3, 'unit-001', 'high')
      const payload = event.toJSON().payload

      expect(payload).toEqual({
        ingredientId: 'ingredient-123',
        ingredientName: 'トマト',
        currentQuantity: 1,
        thresholdQuantity: 3,
        unitId: 'unit-001',
        urgencyLevel: 'high',
      })
    })

    it('緊急度レベルが指定されていない場合はペイロードに含まれない', () => {
      const event = new StockLevelLow('ingredient-123', 'トマト', 1, 3, 'unit-001')
      const payload = event.toJSON().payload

      expect(payload).toEqual({
        ingredientId: 'ingredient-123',
        ingredientName: 'トマト',
        currentQuantity: 1,
        thresholdQuantity: 3,
        unitId: 'unit-001',
      })
      expect(payload).not.toHaveProperty('urgencyLevel')
    })
  })
})
