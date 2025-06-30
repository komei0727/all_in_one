import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 在庫切れイベント
 * 食材の在庫が完全になくなった際に発生するドメインイベント
 */
export class StockDepleted extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly ingredientName: string,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    StockDepleted.validateRequiredFields(ingredientId, userId, ingredientName)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'StockDepleted'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      ingredientId: this.ingredientId,
      userId: this.userId,
      ingredientName: this.ingredientName,
    }
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(
    ingredientId: string,
    userId: string,
    ingredientName: string
  ): void {
    if (!ingredientId || ingredientId.trim().length === 0) {
      throw new Error('食材IDは必須です')
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('ユーザーIDは必須です')
    }
    if (!ingredientName || ingredientName.trim().length === 0) {
      throw new Error('食材名は必須です')
    }
  }
}
