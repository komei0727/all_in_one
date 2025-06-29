import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 在庫少量警告イベント
 * 食材の在庫が設定した閾値を下回った際に発生するドメインイベント
 * 在庫補充の警告システムに使用される
 */
export class StockLevelLow extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly ingredientName: string,
    public readonly currentQuantity: number,
    public readonly thresholdQuantity: number,
    public readonly unitId: string,
    public readonly urgencyLevel?: string,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    StockLevelLow.validateRequiredFields(ingredientId, ingredientName, unitId)
    StockLevelLow.validateQuantities(currentQuantity, thresholdQuantity)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'StockLevelLow'
  }

  protected getPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      ingredientId: this.ingredientId,
      ingredientName: this.ingredientName,
      currentQuantity: this.currentQuantity,
      thresholdQuantity: this.thresholdQuantity,
      unitId: this.unitId,
    }

    // 緊急度が指定されている場合のみpayloadに含める
    if (this.urgencyLevel !== undefined) {
      payload.urgencyLevel = this.urgencyLevel
    }

    return payload
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(
    ingredientId: string,
    ingredientName: string,
    unitId: string
  ): void {
    if (!ingredientId || ingredientId.trim().length === 0) {
      throw new Error('食材IDは必須です')
    }
    if (!ingredientName || ingredientName.trim().length === 0) {
      throw new Error('食材名は必須です')
    }
    if (!unitId || unitId.trim().length === 0) {
      throw new Error('単位IDは必須です')
    }
  }

  /**
   * 数量のバリデーション
   */
  private static validateQuantities(currentQuantity: number, thresholdQuantity: number): void {
    if (currentQuantity < 0) {
      throw new Error('現在数量は0以上である必要があります')
    }
    if (currentQuantity > thresholdQuantity) {
      throw new Error('現在数量が閾値以下である必要があります')
    }
  }
}
