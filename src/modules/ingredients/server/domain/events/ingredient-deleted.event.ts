import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 食材削除イベント
 * 食材が削除された際に発生するドメインイベント
 * 削除履歴の記録と廃棄統計に使用される
 */
export class IngredientDeleted extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly ingredientName: string,
    public readonly categoryId: string,
    public readonly lastQuantity: number,
    public readonly unitId: string,
    public readonly reason?: string,
    metadata: Record<string, any> = {}
  ) {
    // バリデーション実行
    IngredientDeleted.validateRequiredFields(
      ingredientId,
      userId,
      ingredientName,
      categoryId,
      unitId
    )
    IngredientDeleted.validateQuantity(lastQuantity)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'IngredientDeleted'
  }

  protected getPayload(): Record<string, any> {
    const payload: Record<string, any> = {
      ingredientId: this.ingredientId,
      userId: this.userId,
      ingredientName: this.ingredientName,
      categoryId: this.categoryId,
      lastQuantity: this.lastQuantity,
      unitId: this.unitId,
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
  private static validateRequiredFields(
    ingredientId: string,
    userId: string,
    ingredientName: string,
    categoryId: string,
    unitId: string
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
    if (!categoryId || categoryId.trim().length === 0) {
      throw new Error('カテゴリーIDは必須です')
    }
    if (!unitId || unitId.trim().length === 0) {
      throw new Error('単位IDは必須です')
    }
  }

  /**
   * 最終在庫量のバリデーション
   */
  private static validateQuantity(quantity: number): void {
    if (quantity < 0) {
      throw new Error('最終在庫量は0以上である必要があります')
    }
  }
}
