import { describe, it, expect } from 'vitest'
import { IngredientUpdated } from '@/modules/ingredients/server/domain/events/ingredient-updated.event'

describe('IngredientUpdated イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで食材更新イベントを作成できる', () => {
      // 食材情報更新時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        changes: {
          name: { from: 'トマト', to: 'プチトマト' },
          categoryId: { from: 'category-001', to: 'category-002' },
        },
      }
      const metadata = {
        userId: 'user-456',
        correlationId: 'update-789',
      }

      // Act
      const event = new IngredientUpdated(
        eventData.ingredientId,
        eventData.userId,
        eventData.changes,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('IngredientUpdated')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.userId).toBe(eventData.userId)
      expect(event.changes).toEqual(eventData.changes)
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータなしで作成できる', () => {
      // メタデータなしでも作成できることを確認
      const changes = {
        name: { from: 'トマト', to: 'プチトマト' },
      }
      const event = new IngredientUpdated('ingredient-123', 'user-456', changes)

      // Assert
      expect(event.metadata).toEqual({})
    })

    it('単一フィールドの変更でも作成できる', () => {
      // 単一フィールドの変更のみでも作成できることを確認
      const changes = {
        name: { from: 'トマト', to: 'プチトマト' },
      }
      const event = new IngredientUpdated('ingredient-123', 'user-456', changes)

      // Assert
      expect(event.changes).toEqual(changes)
    })

    it('複数フィールドの変更で作成できる', () => {
      // 複数フィールドの同時変更でも作成できることを確認
      const changes = {
        name: { from: 'トマト', to: 'プチトマト' },
        categoryId: { from: 'category-001', to: 'category-002' },
        quantity: { from: 3, to: 5 },
      }
      const event = new IngredientUpdated('ingredient-123', 'user-456', changes)

      // Assert
      expect(event.changes).toEqual(changes)
    })
  })

  describe('JSON変換テスト', () => {
    it('toJSON()で適切な構造を返す', () => {
      // JSON変換が正しく行われることを確認
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        changes: {
          name: { from: 'トマト', to: 'プチトマト' },
          categoryId: { from: 'category-001', to: 'category-002' },
        },
      }
      const metadata = { userId: 'user-456' }

      const event = new IngredientUpdated(
        eventData.ingredientId,
        eventData.userId,
        eventData.changes,
        metadata
      )

      // Act
      const json = event.toJSON()

      // Assert
      expect(json).toMatchObject({
        eventName: 'IngredientUpdated',
        aggregateId: eventData.ingredientId,
        metadata: metadata,
        payload: {
          ingredientId: eventData.ingredientId,
          userId: eventData.userId,
          changes: eventData.changes,
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
      const changes = { name: { from: 'トマト', to: 'プチトマト' } }
      expect(() => {
        new IngredientUpdated('', 'user-456', changes)
      }).toThrow('食材IDは必須です')
    })

    it('ユーザーIDが空の場合はエラーになる', () => {
      const changes = { name: { from: 'トマト', to: 'プチトマト' } }
      expect(() => {
        new IngredientUpdated('ingredient-123', '', changes)
      }).toThrow('ユーザーIDは必須です')
    })

    it('変更内容が空の場合はエラーになる', () => {
      expect(() => {
        new IngredientUpdated('ingredient-123', 'user-456', {})
      }).toThrow('変更内容は必須です')
    })

    it('変更内容がnullの場合はエラーになる', () => {
      expect(() => {
        // @ts-ignore - テスト用に型チェックを無視
        new IngredientUpdated('ingredient-123', 'user-456', null)
      }).toThrow('変更内容は必須です')
    })
  })

  describe('変更履歴・監査用データテスト', () => {
    it('変更履歴に必要な情報が含まれている', () => {
      // 変更履歴で必要とされる情報が含まれていることを確認
      const changes = {
        name: { from: 'トマト', to: 'プチトマト' },
        categoryId: { from: 'category-001', to: 'category-002' },
      }
      const event = new IngredientUpdated('ingredient-123', 'user-456', changes, {
        userId: 'user-456',
        correlationId: 'audit-trail-123',
      })

      const json = event.toJSON()

      // 変更履歴で必要な情報
      expect(json.payload.ingredientId).toBe('ingredient-123') // 対象食材
      expect(json.payload.userId).toBe('user-456') // 変更者
      expect(json.payload.changes).toEqual(changes) // 変更内容詳細
      expect(json.occurredAt).toBeTruthy() // 変更日時
    })

    it('Before/After形式の変更データが正しく保存される', () => {
      // Before/After形式での変更履歴が正しく保存されることを確認
      const changes = {
        name: { from: 'トマト', to: 'プチトマト' },
        quantity: { from: 3, to: 5 },
        expiryDate: {
          from: '2024-01-15',
          to: '2024-01-20',
        },
      }
      const event = new IngredientUpdated('ingredient-123', 'user-456', changes)

      const json = event.toJSON()

      // Before/After形式の変更データ
      expect(json.payload.changes.name.from).toBe('トマト')
      expect(json.payload.changes.name.to).toBe('プチトマト')
      expect(json.payload.changes.quantity.from).toBe(3)
      expect(json.payload.changes.quantity.to).toBe(5)
      expect(json.payload.changes.expiryDate.from).toBe('2024-01-15')
      expect(json.payload.changes.expiryDate.to).toBe('2024-01-20')
    })

    it('監査証跡に必要な情報が含まれている', () => {
      // 監査証跡で必要な情報が含まれていることを確認
      const changes = {
        name: { from: 'トマト', to: 'プチトマト' },
      }
      const event = new IngredientUpdated('ingredient-123', 'user-456', changes, {
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        correlationId: 'correlation-456',
      })

      const json = event.toJSON()

      // 監査証跡で必要な情報
      expect(json.id).toBeTruthy() // イベントID
      expect(json.occurredAt).toBeTruthy() // 変更日時
      expect(json.payload.userId).toBe('user-456') // 変更者
      expect(json.metadata.ipAddress).toBe('192.168.1.1') // アクセス元
      expect(json.metadata.userAgent).toBe('Mozilla/5.0...') // ユーザーエージェント
      expect(json.metadata.correlationId).toBe('correlation-456') // 相関ID
    })
  })
})
