import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 買い物セッション中断イベント
 * 買い物セッションが中断された際に発生するドメインイベント
 */
export class ShoppingSessionAbandoned extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly durationMs: number,
    public readonly reason: string = 'user-action',
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    ShoppingSessionAbandoned.validateRequiredFields(sessionId, userId)
    ShoppingSessionAbandoned.validateDuration(durationMs)

    super(sessionId, metadata)
  }

  get eventName(): string {
    return 'ShoppingSessionAbandoned'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      durationMs: this.durationMs,
      reason: this.reason,
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
   * 継続時間のバリデーション
   */
  private static validateDuration(durationMs: number): void {
    if (durationMs < 0) {
      throw new Error('継続時間は0以上である必要があります')
    }
  }
}
