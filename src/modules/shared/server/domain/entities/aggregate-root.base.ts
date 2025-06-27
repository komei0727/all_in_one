import type { DomainEvent } from '../events/domain-event.base'

/**
 * 集約ルート基底クラス
 * ドメインイベントの管理機能を提供する
 * すべての集約ルートが継承する抽象クラス
 */
export abstract class AggregateRoot {
  private domainEvents: DomainEvent[] = []

  /**
   * ドメインイベントを追加
   * @param event 追加するドメインイベント
   */
  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event)
  }

  /**
   * 未コミットのドメインイベントを取得
   * @returns 未コミットのドメインイベント配列（コピー）
   */
  public getUncommittedEvents(): DomainEvent[] {
    // 不変性を保つため、配列のコピーを返す
    return [...this.domainEvents]
  }

  /**
   * ドメインイベントをコミット済みとしてマーク（クリア）
   * リポジトリがイベントをイベントストアに保存した後に呼び出される
   */
  public markEventsAsCommitted(): void {
    this.domainEvents = []
  }
}
