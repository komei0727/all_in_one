import { describe, it, expect } from 'vitest'
import { StockReplenished } from '@/modules/ingredients/server/domain/events/stock-replenished.event'

describe('StockReplenished イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで在庫補充イベントを作成できる', () => {
      // 在庫補充時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        replenishedAmount: 5,
        previousAmount: 2,
        newTotalAmount: 7,
        unitId: 'unit-001',
      }
      const metadata = {
        userId: 'user-456',
        correlationId: 'replenish-789',
      }

      // Act
      const event = new StockReplenished(
        eventData.ingredientId,
        eventData.userId,
        eventData.replenishedAmount,
        eventData.previousAmount,
        eventData.newTotalAmount,
        eventData.unitId,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('StockReplenished')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.userId).toBe(eventData.userId)
      expect(event.replenishedAmount).toBe(eventData.replenishedAmount)
      expect(event.previousAmount).toBe(eventData.previousAmount)
      expect(event.newTotalAmount).toBe(eventData.newTotalAmount)
      expect(event.unitId).toBe(eventData.unitId)
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータなしで作成できる', () => {
      // メタデータなしでも作成できることを確認
      const event = new StockReplenished('ingredient-123', 'user-456', 5, 2, 7, 'unit-001')

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
        replenishedAmount: 5,
        previousAmount: 2,
        newTotalAmount: 7,
        unitId: 'unit-001',
      }
      const metadata = { userId: 'user-456' }

      const event = new StockReplenished(
        eventData.ingredientId,
        eventData.userId,
        eventData.replenishedAmount,
        eventData.previousAmount,
        eventData.newTotalAmount,
        eventData.unitId,
        metadata
      )

      // Act
      const json = event.toJSON()

      // Assert
      expect(json).toMatchObject({
        eventName: 'StockReplenished',
        aggregateId: eventData.ingredientId,
        metadata: metadata,
        payload: {
          ingredientId: eventData.ingredientId,
          userId: eventData.userId,
          replenishedAmount: eventData.replenishedAmount,
          previousAmount: eventData.previousAmount,
          newTotalAmount: eventData.newTotalAmount,
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
        new StockReplenished('', 'user-456', 5, 2, 7, 'unit-001')
      }).toThrow('食材IDは必須です')
    })

    it('ユーザーIDが空の場合はエラーになる', () => {
      expect(() => {
        new StockReplenished('ingredient-123', '', 5, 2, 7, 'unit-001')
      }).toThrow('ユーザーIDは必須です')
    })

    it('補充量が0以下の場合はエラーになる', () => {
      expect(() => {
        new StockReplenished('ingredient-123', 'user-456', 0, 2, 7, 'unit-001')
      }).toThrow('補充量は0より大きい必要があります')

      expect(() => {
        new StockReplenished('ingredient-123', 'user-456', -1, 2, 7, 'unit-001')
      }).toThrow('補充量は0より大きい必要があります')
    })

    it('以前の在庫量が0未満の場合はエラーになる', () => {
      expect(() => {
        new StockReplenished('ingredient-123', 'user-456', 5, -1, 7, 'unit-001')
      }).toThrow('以前の在庫量は0以上である必要があります')
    })

    it('新しい総在庫量が0以下の場合はエラーになる', () => {
      expect(() => {
        new StockReplenished('ingredient-123', 'user-456', 5, 2, 0, 'unit-001')
      }).toThrow('新しい総在庫量は0より大きい必要があります')

      expect(() => {
        new StockReplenished('ingredient-123', 'user-456', 5, 2, -1, 'unit-001')
      }).toThrow('新しい総在庫量は0より大きい必要があります')
    })

    it('数量の整合性チェック（前の在庫量+補充量≠新しい総在庫量）', () => {
      // 計算が合わない場合はエラーになる
      expect(() => {
        new StockReplenished('ingredient-123', 'user-456', 5, 2, 10, 'unit-001') // 2+5≠10
      }).toThrow('在庫量の計算が正しくありません')
    })

    it('単位IDが空の場合はエラーになる', () => {
      expect(() => {
        new StockReplenished('ingredient-123', 'user-456', 5, 2, 7, '')
      }).toThrow('単位IDは必須です')
    })
  })

  describe('在庫管理・分析用データテスト', () => {
    it('在庫履歴に必要な情報が含まれている', () => {
      // 在庫履歴で必要とされる情報が含まれていることを確認
      const event = new StockReplenished('ingredient-123', 'user-456', 5, 2, 7, 'unit-001', {
        userId: 'user-456',
        correlationId: 'stock-tracking-123',
      })

      const json = event.toJSON()

      // 在庫履歴で必要な情報
      expect(json.payload.ingredientId).toBe('ingredient-123') // 対象食材
      expect(json.payload.userId).toBe('user-456') // 補充者
      expect(json.payload.replenishedAmount).toBe(5) // 補充量
      expect(json.payload.previousAmount).toBe(2) // 補充前在庫
      expect(json.payload.newTotalAmount).toBe(7) // 補充後在庫
      expect(json.payload.unitId).toBe('unit-001') // 単位
      expect(json.occurredAt).toBeTruthy() // 補充日時
    })

    it('購入パターン分析に必要な情報が含まれている', () => {
      // 購入パターン分析で必要な情報が含まれていることを確認
      const event = new StockReplenished('ingredient-123', 'user-456', 10, 0, 10, 'unit-001')

      const json = event.toJSON()

      // 購入パターン分析で必要な情報
      expect(json.payload.replenishedAmount).toBe(10) // 購入量分析用
      expect(json.payload.previousAmount).toBe(0) // 在庫切れからの補充判定用
      expect(json.occurredAt).toBeTruthy() // 購入タイミング分析用
      expect(json.payload.userId).toBe('user-456') // ユーザー別購入パターン分析用
    })

    it('在庫レベル監視に必要な情報が含まれている', () => {
      // 在庫レベル監視で必要な情報が含まれていることを確認
      const event = new StockReplenished(
        'ingredient-123',
        'user-456',
        3,
        1, // 在庫少量から補充
        4,
        'unit-001'
      )

      const json = event.toJSON()

      // 在庫レベル監視で必要な情報
      expect(json.payload.previousAmount).toBe(1) // 補充前在庫レベル
      expect(json.payload.newTotalAmount).toBe(4) // 補充後在庫レベル
      expect(json.payload.ingredientId).toBe('ingredient-123') // 監視対象特定用
    })

    it('自動補充システム連携データが含まれている', () => {
      // 自動補充システムとの連携で必要な情報が含まれていることを確認
      const event = new StockReplenished(
        'ingredient-123',
        'system-auto-replenish',
        5,
        1,
        6,
        'unit-001',
        {
          autoReplenish: true,
          triggerThreshold: 2,
          replenishRule: 'low-stock-trigger',
        }
      )

      const json = event.toJSON()

      // 自動補充システム連携データ
      expect(json.payload.userId).toBe('system-auto-replenish') // 自動補充判定用
      expect(json.metadata.autoReplenish).toBe(true) // 自動補充フラグ
      expect(json.metadata.triggerThreshold).toBe(2) // 発動閾値
      expect(json.metadata.replenishRule).toBe('low-stock-trigger') // 補充ルール
    })
  })
})
