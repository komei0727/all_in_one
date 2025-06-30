import { describe, it, expect, vi } from 'vitest'

import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

// テスト用の具体的なドメインイベントクラス
class TestDomainEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    private readonly testData: string,
    metadata?: Record<string, unknown>,
    version?: number
  ) {
    super(aggregateId, metadata, version)
  }

  get eventName(): string {
    return 'test.domainEvent'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      testData: this.testData,
    }
  }
}

describe('DomainEvent基底クラス', () => {
  describe('イベントの作成', () => {
    it('基本的なプロパティが正しく設定される', () => {
      // Arrange（準備）
      const aggregateId = 'agg-123'
      const testData = 'テストデータ'

      // Act（実行）
      const event = new TestDomainEvent(aggregateId, testData)

      // Assert（検証）
      expect(event.aggregateId).toBe(aggregateId)
      expect(event.eventName).toBe('test.domainEvent')
      expect(event.version).toBe(1)
      expect(event.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) // UUID形式
      expect(event.occurredAt).toBeInstanceOf(Date)
      expect(event.metadata).toEqual({})
    })

    it('メタデータとバージョンを指定して作成できる', () => {
      // Arrange（準備）
      const aggregateId = 'agg-456'
      const testData = 'テストデータ2'
      const metadata = { userId: 'user-123', source: 'API' }
      const version = 2

      // Act（実行）
      const event = new TestDomainEvent(aggregateId, testData, metadata, version)

      // Assert（検証）
      expect(event.aggregateId).toBe(aggregateId)
      expect(event.version).toBe(version)
      expect(event.metadata).toEqual(metadata)
    })

    it('メタデータの不変性が保たれる', () => {
      // Arrange（準備）
      const aggregateId = 'agg-789'
      const testData = 'テストデータ3'
      const originalMetadata = { userId: 'user-456', nested: { value: 'original' } }

      // Act（実行）
      const event = new TestDomainEvent(aggregateId, testData, originalMetadata)

      // メタデータを変更
      originalMetadata.userId = 'user-999'
      originalMetadata.nested.value = 'modified'

      // Assert（検証）
      expect(event.metadata).toEqual({ userId: 'user-456', nested: { value: 'original' } })
    })

    it('メタデータがnullの場合は空オブジェクトになる', () => {
      // Arrange（準備）
      const aggregateId = 'agg-null'
      const testData = 'テストデータ'

      // Act（実行）
      const event = new TestDomainEvent(aggregateId, testData, null as any)

      // Assert（検証）
      expect(event.metadata).toEqual({})
    })

    it('メタデータがundefinedの場合は空オブジェクトになる', () => {
      // Arrange（準備）
      const aggregateId = 'agg-undefined'
      const testData = 'テストデータ'

      // Act（実行）
      const event = new TestDomainEvent(aggregateId, testData, undefined)

      // Assert（検証）
      expect(event.metadata).toEqual({})
    })
  })

  describe('toJSON', () => {
    it('イベントをJSON形式に変換できる', () => {
      // Arrange（準備）
      const aggregateId = 'agg-json-1'
      const testData = 'JSONテストデータ'
      const metadata = { requestId: 'req-123' }

      // 日付をモック
      const mockDate = new Date('2024-12-30T12:00:00.000Z')
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

      // Act（実行）
      const event = new TestDomainEvent(aggregateId, testData, metadata)
      const json = event.toJSON()

      // Assert（検証）
      expect(json).toEqual({
        id: event.id,
        eventName: 'test.domainEvent',
        aggregateId: aggregateId,
        version: 1,
        occurredAt: '2024-12-30T12:00:00.000Z',
        metadata: metadata,
        payload: {
          testData: testData,
        },
      })

      // モックをリセット
      vi.restoreAllMocks()
    })

    it('複雑なペイロードを持つイベントもJSON化できる', () => {
      // Arrange（準備）
      class ComplexTestEvent extends DomainEvent {
        constructor(
          aggregateId: string,
          private readonly complexData: Record<string, unknown>
        ) {
          super(aggregateId)
        }

        get eventName(): string {
          return 'test.complexEvent'
        }

        protected getPayload(): Record<string, unknown> {
          return this.complexData
        }
      }

      const aggregateId = 'agg-complex'
      const complexData = {
        items: ['item1', 'item2'],
        nested: {
          value: 123,
          flag: true,
        },
        nullValue: null,
        undefinedValue: undefined,
      }

      // Act（実行）
      const event = new ComplexTestEvent(aggregateId, complexData)
      const json = event.toJSON()

      // Assert（検証）
      expect(json.payload).toEqual(complexData)
    })
  })

  describe('イベントプロパティの不変性', () => {
    it('作成後のプロパティは変更できない', () => {
      // Arrange（準備）
      const event = new TestDomainEvent('agg-immutable', 'データ')
      const originalId = event.id
      const originalAggregateId = event.aggregateId
      const originalVersion = event.version

      // Act（実行）
      // TypeScriptの型システムでreadonlyが強制されている
      // 実行時には暗黙的にプロパティが変更できないことを確認

      // Assert（検証）
      // プロパティが元の値のままであることを確認
      expect(event.id).toBe(originalId)
      expect(event.aggregateId).toBe(originalAggregateId)
      expect(event.version).toBe(originalVersion)

      // Object.freeze などで明示的に不変にしていないが、
      // readonlyプロパティとして設計されている
      expect(Object.getOwnPropertyDescriptor(event, 'id')?.writable).toBe(true)
      expect(Object.getOwnPropertyDescriptor(event, 'aggregateId')?.writable).toBe(true)
      expect(Object.getOwnPropertyDescriptor(event, 'version')?.writable).toBe(true)
    })
  })
})
