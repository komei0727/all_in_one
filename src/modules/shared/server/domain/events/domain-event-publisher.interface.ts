import { DomainEvent } from './domain-event.base'

/**
 * ドメインイベントパブリッシャーインターフェース
 * 集約から発生したイベントを外部に発行する
 */
export interface DomainEventPublisher {
  /**
   * 単一のイベントを発行
   */
  publish(event: DomainEvent): Promise<void>

  /**
   * 複数のイベントを発行
   */
  publishAll(events: readonly DomainEvent[]): Promise<void>
}
