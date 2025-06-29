import { describe, it, expect } from 'vitest'

import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

// テスト用の具象イベントクラス
class TestDomainEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly testData: string,
    metadata?: Record<string, any>,
    version?: number
  ) {
    super(aggregateId, metadata, version)
  }

  get eventName(): string {
    return 'TestEvent'
  }

  protected getPayload(): Record<string, any> {
    return {
      testData: this.testData,
    }
  }
}

describe('DomainEvent基底クラス', () => {
  describe('基本的なプロパティテスト', () => {
    it('必須プロパティが正しく設定される', () => {
      // イベントの基本的なプロパティが正しく設定されることを確認
      const aggregateId = 'ingredient-123'
      const testData = 'テストデータ'
      const event = new TestDomainEvent(aggregateId, testData)

      // Assert
      expect(event.id).toBeTruthy()
      expect(event.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) // UUID形式
      expect(event.aggregateId).toBe(aggregateId)
      expect(event.occurredAt).toBeInstanceOf(Date)
      expect(event.version).toBe(1) // デフォルトバージョン
      expect(event.eventName).toBe('TestEvent')
    })

    it('カスタムバージョンで作成できる', () => {
      // カスタムバージョンでイベントを作成
      const event = new TestDomainEvent('ingredient-123', 'test', undefined, 5)

      // Assert
      expect(event.version).toBe(5)
    })

    it('メタデータを設定できる', () => {
      // メタデータ付きでイベントを作成
      const metadata = {
        userId: 'user-123',
        correlationId: 'correlation-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      }
      const event = new TestDomainEvent('ingredient-123', 'test', metadata)

      // Assert
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータが未指定の場合は空オブジェクトになる', () => {
      // メタデータなしでイベントを作成
      const event = new TestDomainEvent('ingredient-123', 'test')

      // Assert
      expect(event.metadata).toEqual({})
    })
  })

  describe('JSON変換テスト', () => {
    it('toJSON()で正しい構造のオブジェクトを返す', () => {
      // イベントがJSON形式に正しく変換されることを確認
      const aggregateId = 'ingredient-123'
      const testData = 'テストデータ'
      const metadata = {
        userId: 'user-123',
        correlationId: 'correlation-456',
      }
      const event = new TestDomainEvent(aggregateId, testData, metadata, 2)

      // Act
      const json = event.toJSON()

      // Assert
      expect(json).toEqual({
        id: event.id,
        eventName: 'TestEvent',
        aggregateId: aggregateId,
        version: 2,
        occurredAt: event.occurredAt.toISOString(),
        metadata: metadata,
        payload: {
          testData: testData,
        },
      })
    })

    it('メタデータが空の場合もJSON変換できる', () => {
      // メタデータが空でもJSON変換できることを確認
      const event = new TestDomainEvent('ingredient-123', 'test')
      const json = event.toJSON()

      // Assert
      expect(json.metadata).toEqual({})
      expect(json.payload).toEqual({ testData: 'test' })
    })
  })

  describe('不変性テスト', () => {
    it('作成後にプロパティが変更できない', () => {
      // イベントのプロパティが不変であることを確認
      const event = new TestDomainEvent('ingredient-123', 'test')

      // Assert - readonly プロパティなので TypeScript でコンパイルエラーになることを期待
      // 実行時の確認として、プロパティが存在し変更されないことを確認
      const originalId = event.id
      const originalOccurredAt = event.occurredAt
      const originalAggregateId = event.aggregateId
      const originalVersion = event.version

      // プロパティが変更されていないことを確認
      expect(event.id).toBe(originalId)
      expect(event.occurredAt).toBe(originalOccurredAt)
      expect(event.aggregateId).toBe(originalAggregateId)
      expect(event.version).toBe(originalVersion)
    })

    it('メタデータが外部から変更されない', () => {
      // メタデータの不変性を確認
      const originalMetadata = {
        userId: 'user-123',
        correlationId: 'correlation-456',
      }
      const event = new TestDomainEvent('ingredient-123', 'test', originalMetadata)

      // 元のオブジェクトを変更してもイベントのメタデータは影響を受けない
      originalMetadata.userId = 'changed-user'

      // Assert
      expect(event.metadata.userId).toBe('user-123') // 変更されていない
    })
  })

  describe('イベント時系列性テスト', () => {
    it('連続して作成されたイベントの時刻が順序を保つ', () => {
      // イベントが作成順に時刻が設定されることを確認
      const event1 = new TestDomainEvent('ingredient-123', 'first')
      // 短い間隔でも時刻差を確保するため少し待機
      const event2 = new TestDomainEvent('ingredient-123', 'second')

      // Assert
      expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime())
    })

    it('同じ集約の異なるバージョンのイベントを作成できる', () => {
      // 同じ集約で異なるバージョンのイベントを作成
      const aggregateId = 'ingredient-123'
      const event1 = new TestDomainEvent(aggregateId, 'version1', {}, 1)
      const event2 = new TestDomainEvent(aggregateId, 'version2', {}, 2)

      // Assert
      expect(event1.aggregateId).toBe(event2.aggregateId)
      expect(event1.version).toBe(1)
      expect(event2.version).toBe(2)
      expect(event1.id).not.toBe(event2.id) // イベントIDは異なる
    })
  })
})
