import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 食材更新イベント
 * 食材情報が更新された際に発生するドメインイベント
 * 変更履歴の記録と監査証跡に使用される
 */
export class IngredientUpdated extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    metadata: Record<string, any> = {}
  ) {
    // バリデーション実行
    IngredientUpdated.validateRequiredFields(ingredientId, userId, changes)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'IngredientUpdated'
  }

  protected getPayload(): Record<string, any> {
    return {
      ingredientId: this.ingredientId,
      userId: this.userId,
      changes: this.changes,
    }
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(
    ingredientId: string,
    userId: string,
    changes: Record<string, { from: any; to: any }> | null
  ): void {
    if (!ingredientId || ingredientId.trim().length === 0) {
      throw new Error('食材IDは必須です')
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('ユーザーIDは必須です')
    }
    if (!changes || Object.keys(changes).length === 0) {
      throw new Error('変更内容は必須です')
    }
  }
}
