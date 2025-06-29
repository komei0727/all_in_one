import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 食材期限切れイベント
 * 食材の賞味期限が切れた際に発生するドメインイベント
 * 期限切れ通知と廃棄管理に使用される
 */
export class IngredientExpired extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly ingredientName: string,
    public readonly categoryId: string,
    public readonly expiredDate: Date,
    public readonly remainingDays: number,
    public readonly remainingQuantity: number,
    public readonly unitId: string,
    metadata: Record<string, unknown> = {}
  ) {
    // バリデーション実行
    IngredientExpired.validateRequiredFields(ingredientId, ingredientName, categoryId, unitId)
    IngredientExpired.validateExpiredDate(expiredDate)
    IngredientExpired.validateQuantity(remainingQuantity)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'IngredientExpired'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      ingredientId: this.ingredientId,
      ingredientName: this.ingredientName,
      categoryId: this.categoryId,
      expiredDate: this.expiredDate.toISOString(),
      remainingDays: this.remainingDays,
      remainingQuantity: this.remainingQuantity,
      unitId: this.unitId,
    }
  }

  /**
   * 必須フィールドのバリデーション
   */
  private static validateRequiredFields(
    ingredientId: string,
    ingredientName: string,
    categoryId: string,
    unitId: string
  ): void {
    if (!ingredientId || ingredientId.trim().length === 0) {
      throw new Error('食材IDは必須です')
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
   * 期限日のバリデーション
   */
  private static validateExpiredDate(expiredDate: Date): void {
    // 未来すぎる日付（1年以上先）は異常値として扱う
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

    if (expiredDate > oneYearFromNow) {
      throw new Error('期限日が異常です')
    }
  }

  /**
   * 残り数量のバリデーション
   */
  private static validateQuantity(quantity: number): void {
    if (quantity < 0) {
      throw new Error('残り数量は0以上である必要があります')
    }
  }
}
