import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 食材確認イベント
 * 買い物セッション中に食材が確認された際に発生するドメインイベント
 */
export class ItemChecked extends DomainEvent {
  constructor(
    public readonly sessionId: string,
    public readonly ingredientId: string,
    public readonly ingredientName: string,
    public readonly stockStatus: string,
    public readonly expiryStatus: string,
    public readonly checkedAt: Date,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    ItemChecked.validateRequiredFields(
      sessionId,
      ingredientId,
      ingredientName,
      stockStatus,
      expiryStatus
    )
    ItemChecked.validateDate(checkedAt)

    super(sessionId, metadata)
  }

  get eventName(): string {
    return 'ItemChecked'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      ingredientId: this.ingredientId,
      ingredientName: this.ingredientName,
      stockStatus: this.stockStatus,
      expiryStatus: this.expiryStatus,
      checkedAt: this.checkedAt.toISOString(),
    }
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(
    sessionId: string,
    ingredientId: string,
    ingredientName: string,
    stockStatus: string,
    expiryStatus: string
  ): void {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new Error('セッションIDは必須です')
    }
    if (!ingredientId || ingredientId.trim().length === 0) {
      throw new Error('食材IDは必須です')
    }
    if (!ingredientName || ingredientName.trim().length === 0) {
      throw new Error('食材名は必須です')
    }
    if (!stockStatus || stockStatus.trim().length === 0) {
      throw new Error('在庫状態は必須です')
    }
    if (!expiryStatus || expiryStatus.trim().length === 0) {
      throw new Error('期限状態は必須です')
    }
  }

  /**
   * 日付のバリデーション
   */
  private static validateDate(date: Date): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('有効な確認日時が必要です')
    }
  }
}
