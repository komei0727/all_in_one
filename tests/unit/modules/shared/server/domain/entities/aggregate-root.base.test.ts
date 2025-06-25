import { describe, it, expect } from 'vitest'
import { AggregateRoot } from '@/modules/shared/server/domain/entities/aggregate-root.base'
import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

// テスト用の具象集約ルート
class TestAggregate extends AggregateRoot {
  constructor(public id: string) {
    super()
  }

  // テスト用のビジネスメソッド
  doSomething(): void {
    const event = new TestDomainEvent(this.id, 'something happened')
    this.addDomainEvent(event)
  }
}

// テスト用の具象イベント
class TestDomainEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: string,
    metadata?: Record<string, any>
  ) {
    super(aggregateId, metadata)
  }

  get eventName(): string {
    return 'TestEvent'
  }

  protected getPayload(): Record<string, any> {
    return {
      data: this.data,
    }
  }
}

describe('AggregateRoot基底クラス', () => {
  describe('イベント管理機能', () => {
    it('ドメインイベントを追加できる', () => {
      // 集約ルートがドメインイベントを追加できることを確認
      const aggregate = new TestAggregate('aggregate-123')
      const event = new TestDomainEvent('aggregate-123', 'test data')

      // Act
      aggregate.doSomething()

      // Assert
      const events = aggregate.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventName).toBe('TestEvent')
    })

    it('複数のドメインイベントを追加できる', () => {
      // 複数のイベントを追加できることを確認
      const aggregate = new TestAggregate('aggregate-123')

      // Act
      aggregate.doSomething()
      aggregate.doSomething()
      aggregate.doSomething()

      // Assert
      const events = aggregate.getUncommittedEvents()
      expect(events).toHaveLength(3)
    })

    it('コミットされていないイベントを取得できる', () => {
      // 未コミットイベントの取得機能を確認
      const aggregate = new TestAggregate('aggregate-123')
      aggregate.doSomething()

      // Act
      const uncommittedEvents = aggregate.getUncommittedEvents()

      // Assert
      expect(uncommittedEvents).toHaveLength(1)
      expect(uncommittedEvents[0]).toBeInstanceOf(TestDomainEvent)
    })

    it('イベントをクリアできる', () => {
      // イベントのクリア機能を確認
      const aggregate = new TestAggregate('aggregate-123')
      aggregate.doSomething()

      // Act
      aggregate.markEventsAsCommitted()

      // Assert
      const events = aggregate.getUncommittedEvents()
      expect(events).toHaveLength(0)
    })

    it('クリア後に新しいイベントを追加できる', () => {
      // クリア後も正常に動作することを確認
      const aggregate = new TestAggregate('aggregate-123')
      aggregate.doSomething()
      aggregate.markEventsAsCommitted()

      // Act
      aggregate.doSomething()

      // Assert
      const events = aggregate.getUncommittedEvents()
      expect(events).toHaveLength(1)
    })
  })

  describe('イベントの不変性', () => {
    it('取得したイベント配列を変更しても内部状態は変わらない', () => {
      // イベント配列の不変性を確認
      const aggregate = new TestAggregate('aggregate-123')
      aggregate.doSomething()

      // Act
      const events = aggregate.getUncommittedEvents()
      events.push(new TestDomainEvent('another-123', 'hacked'))

      // Assert
      const actualEvents = aggregate.getUncommittedEvents()
      expect(actualEvents).toHaveLength(1) // 元の1つのみ
    })
  })

  describe('イベント順序性', () => {
    it('イベントは追加順序を保持する', () => {
      // イベントの順序が保持されることを確認
      const aggregate = new TestAggregate('aggregate-123')

      // 異なるデータで3つのイベントを追加
      const event1 = new TestDomainEvent('aggregate-123', 'first')
      const event2 = new TestDomainEvent('aggregate-123', 'second')
      const event3 = new TestDomainEvent('aggregate-123', 'third')

      // Actの代わりに直接addDomainEventを呼ぶ（テスト用）
      aggregate['addDomainEvent'](event1)
      aggregate['addDomainEvent'](event2)
      aggregate['addDomainEvent'](event3)

      // Assert
      const events = aggregate.getUncommittedEvents()
      expect(events[0]).toBe(event1)
      expect(events[1]).toBe(event2)
      expect(events[2]).toBe(event3)
    })
  })
})
