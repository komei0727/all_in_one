import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 買い物セッション完了イベント
 * 買い物セッションが正常に完了した際に発生するドメインイベント
 */
export class ShoppingSessionCompleted extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly durationMs: number,
    public readonly checkedItemsCount: number,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    ShoppingSessionCompleted.validateRequiredFields(sessionId, userId)
    ShoppingSessionCompleted.validateNumbers(durationMs, checkedItemsCount)

    super(sessionId, metadata)
  }

  get eventName(): string {
    return 'ShoppingSessionCompleted'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      durationMs: this.durationMs,
      checkedItemsCount: this.checkedItemsCount,
    }
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(sessionId: string, userId: string): void {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new Error('セッションIDは必須です')
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('ユーザーIDは必須です')
    }
  }

  /**
   * 数値のバリデーション
   */
  private static validateNumbers(durationMs: number, checkedItemsCount: number): void {
    if (durationMs < 0) {
      throw new Error('継続時間は0以上である必要があります')
    }
    if (checkedItemsCount < 0) {
      throw new Error('確認件数は0以上である必要があります')
    }
  }
}
