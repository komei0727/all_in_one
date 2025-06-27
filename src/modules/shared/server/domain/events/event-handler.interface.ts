import type { DomainEvent } from './domain-event.base'

/**
 * イベントハンドラーインターフェース
 * ドメインイベントを処理するハンドラーが実装すべき契約
 */
export interface EventHandler<T extends DomainEvent> {
  /**
   * イベントを処理する
   * @param event 処理対象のドメインイベント
   * @returns 処理完了のPromise
   */
  handle(event: T): Promise<void>
}
