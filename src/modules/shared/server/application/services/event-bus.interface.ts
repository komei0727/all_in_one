import type { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * イベントバスインターフェース
 * ドメインイベントの発行を抽象化
 */
export interface EventBus {
  /**
   * 単一のイベントを発行
   * @param event 発行するイベント
   */
  publish(event: DomainEvent): Promise<void>

  /**
   * 複数のイベントを一括発行
   * @param events 発行するイベントの配列
   */
  publishAll(events: DomainEvent[]): Promise<void>
}
