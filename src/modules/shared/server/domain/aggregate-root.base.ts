import type { DomainEvent } from './events/domain-event.base'

/**
 * 集約ルート基底クラス
 * ドメインイベントの管理機能を提供する
 * すべての集約ルートエンティティはこのクラスを継承する
 */
export abstract class AggregateRoot<T> {
  private _domainEvents: DomainEvent[] = []

  constructor(protected readonly id: T) {}

  /**
   * 保持しているドメインイベントの読み取り専用リストを取得
   */
  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents
  }

  /**
   * ドメインイベントを追加
   * 集約内で発生したビジネス上の重要な出来事を記録する
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  /**
   * 保持しているすべてのドメインイベントをクリア
   * イベントが外部に発行された後に呼び出される
   */
  clearEvents(): void {
    this._domainEvents = []
  }

  /**
   * 等価性の比較
   * 集約ルートの等価性はIDで判断する
   */
  abstract equals(other: any): boolean
}
