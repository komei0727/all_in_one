import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 期限切れ間近イベント
 * 食材の期限が近づいている際に発生するドメインイベント
 */
export class IngredientExpiringSoon extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly ingredientName: string,
    public readonly remainingDays: number,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    IngredientExpiringSoon.validateRequiredFields(ingredientId, userId, ingredientName)
    IngredientExpiringSoon.validateRemainingDays(remainingDays)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'IngredientExpiringSoon'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      ingredientId: this.ingredientId,
      userId: this.userId,
      ingredientName: this.ingredientName,
      remainingDays: this.remainingDays,
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

  /**
   * 残り日数のバリデーション
   */
  private static validateRemainingDays(remainingDays: number): void {
    if (!Number.isInteger(remainingDays)) {
      throw new Error('残り日数は整数である必要があります')
    }
    if (remainingDays < 0) {
      throw new Error('残り日数は0以上である必要があります')
    }
  }
}
