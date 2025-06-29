import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 在庫補充イベント
 * 食材の在庫が補充された際に発生するドメインイベント
 * 在庫履歴の記録と購入パターン分析に使用される
 */
export class StockReplenished extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly replenishedAmount: number,
    public readonly previousAmount: number,
    public readonly newTotalAmount: number,
    public readonly unitId: string,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    StockReplenished.validateRequiredFields(ingredientId, userId, unitId)
    StockReplenished.validateAmounts(replenishedAmount, previousAmount, newTotalAmount)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'StockReplenished'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      ingredientId: this.ingredientId,
      userId: this.userId,
      replenishedAmount: this.replenishedAmount,
      previousAmount: this.previousAmount,
      newTotalAmount: this.newTotalAmount,
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
  private static validateAmounts(
    replenishedAmount: number,
    previousAmount: number,
    newTotalAmount: number
  ): void {
    if (replenishedAmount <= 0) {
      throw new Error('補充量は0より大きい必要があります')
    }
    if (previousAmount < 0) {
      throw new Error('以前の在庫量は0以上である必要があります')
    }
    if (newTotalAmount <= 0) {
      throw new Error('新しい総在庫量は0より大きい必要があります')
    }

    // 数量の整合性チェック（前の在庫量 + 補充量 = 新しい総在庫量）
    if (previousAmount + replenishedAmount !== newTotalAmount) {
      throw new Error('在庫量の計算が正しくありません')
    }
  }
}
