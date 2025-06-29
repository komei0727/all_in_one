import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 賞味期限更新イベント
 * 食材の賞味期限が変更された際に発生するドメインイベント
 * 期限管理の履歴追跡に使用される
 */
export class ExpiryDateUpdated extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly previousExpiryDate: Date,
    public readonly newExpiryDate: Date,
    public readonly reason?: string,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    ExpiryDateUpdated.validateRequiredFields(ingredientId, userId)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'ExpiryDateUpdated'
  }

  protected getPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      ingredientId: this.ingredientId,
      userId: this.userId,
      previousExpiryDate: this.previousExpiryDate.toISOString(),
      newExpiryDate: this.newExpiryDate.toISOString(),
    }

    // 理由が指定されている場合のみpayloadに含める
    if (this.reason !== undefined) {
      payload.reason = this.reason
    }

    return payload
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(ingredientId: string, userId: string): void {
    if (!ingredientId || ingredientId.trim().length === 0) {
      throw new Error('食材IDは必須です')
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('ユーザーIDは必須です')
    }
  }
}
