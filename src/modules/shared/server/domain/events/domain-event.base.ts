/**
 * ドメインイベント基底クラス
 * すべてのドメインイベントが継承する抽象クラス
 * ビジネス上の重要な出来事を表現し、不変性を保つ
 */
export abstract class DomainEvent {
  public readonly id: string
  public readonly occurredAt: Date
  public readonly aggregateId: string
  public readonly version: number
  public readonly metadata: Record<string, unknown>

  constructor(aggregateId: string, metadata: Record<string, unknown> = {}, version = 1) {
    this.id = crypto.randomUUID()
    this.occurredAt = new Date()
    this.aggregateId = aggregateId
    this.version = version
    // メタデータの不変性を保つため、ディープコピーを作成
    // Node.js 17未満の環境も考慮してJSON経由でクローン
    this.metadata = metadata
      ? (JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>)
      : {}
  }

  /**
   * イベント名を取得
   * イベントタイプの識別に使用される
   */
  abstract get eventName(): string

  /**
   * イベントをJSON形式に変換
   * ログ出力やイベントストアへの保存に使用
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      eventName: this.eventName,
      aggregateId: this.aggregateId,
      version: this.version,
      occurredAt: this.occurredAt.toISOString(),
      metadata: this.metadata,
      payload: this.getPayload(),
    }
  }

  /**
   * イベント固有のペイロードを取得
   * 各イベントクラスで実装する
   */
  protected abstract getPayload(): Record<string, unknown>
}
