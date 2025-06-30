import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 買い物セッション開始イベント
 * 新しい買い物セッションが開始された際に発生するドメインイベント
 */
export class ShoppingSessionStarted extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly startedAt: Date,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    ShoppingSessionStarted.validateRequiredFields(sessionId, userId)
    ShoppingSessionStarted.validateDate(startedAt)

    super(sessionId, metadata)
  }

  get eventName(): string {
    return 'ShoppingSessionStarted'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startedAt: this.startedAt.toISOString(),
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
   * 日付のバリデーション
   */
  private static validateDate(date: Date): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('有効な開始日時が必要です')
    }
  }
}
