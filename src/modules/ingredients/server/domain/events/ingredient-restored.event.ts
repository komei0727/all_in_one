import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 食材復元イベント
 * 削除された食材が復元された際に発生するドメインイベント
 */
export class IngredientRestored extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly ingredientName: string,
    public readonly restoredFromDate: Date,
    metadata: Record<string, unknown> = {}
  ) {
    IngredientRestored.validateRequiredFields(ingredientId, userId, ingredientName)
    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'IngredientRestored'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      ingredientId: this.ingredientId,
      userId: this.userId,
      ingredientName: this.ingredientName,
      restoredFromDate: this.restoredFromDate.toISOString(),
    }
  }

  private static validateRequiredFields(
    ingredientId: string,
    userId: string,
    ingredientName: string
  ): void {
    if (!ingredientId?.trim()) throw new Error('食材IDは必須です')
    if (!userId?.trim()) throw new Error('ユーザーIDは必須です')
    if (!ingredientName?.trim()) throw new Error('食材名は必須です')
  }
}
