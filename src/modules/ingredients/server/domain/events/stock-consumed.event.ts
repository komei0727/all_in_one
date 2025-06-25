import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 在庫消費イベント
 * 食材が消費された際に発生するドメインイベント
 * 消費履歴の記録と在庫管理に使用される
 */
export class StockConsumed extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly consumedAmount: number,
    public readonly remainingAmount: number,
    public readonly unitId: string,
    metadata: Record<string, any> = {}
  ) {
    // バリデーション実行
    StockConsumed.validateRequiredFields(ingredientId, userId, unitId)
    StockConsumed.validateAmounts(consumedAmount, remainingAmount)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'StockConsumed'
  }

  protected getPayload(): Record<string, any> {
    return {
      ingredientId: this.ingredientId,
      userId: this.userId,
      consumedAmount: this.consumedAmount,
      remainingAmount: this.remainingAmount,
      unitId: this.unitId,
    }
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(
    ingredientId: string,
    userId: string,
    unitId: string
  ): void {
    if (!ingredientId || ingredientId.trim().length === 0) {
      throw new Error('食材IDは必須です')
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('ユーザーIDは必須です')
    }
    if (!unitId || unitId.trim().length === 0) {
      throw new Error('単位IDは必須です')
    }
  }

  /**
   * 数量のバリデーション
   */
  private static validateAmounts(consumedAmount: number, remainingAmount: number): void {
    if (consumedAmount <= 0) {
      throw new Error('消費量は0より大きい必要があります')
    }
    if (remainingAmount < 0) {
      throw new Error('残量は0以上である必要があります')
    }
  }
}
