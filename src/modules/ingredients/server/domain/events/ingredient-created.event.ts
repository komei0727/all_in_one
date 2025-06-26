import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 食材作成イベント
 * 新しい食材がシステムに登録された際に発生するドメインイベント
 * 監査ログや統計分析に使用される
 */
export class IngredientCreated extends DomainEvent {
  constructor(
    public readonly ingredientId: string,
    public readonly userId: string,
    public readonly ingredientName: string,
    public readonly categoryId: string,
    public readonly initialQuantity: number,
    public readonly unitId: string,
    metadata: Record<string, any> = {}
  ) {
    // バリデーション実行
    IngredientCreated.validateRequiredFields(
      ingredientId,
      userId,
      ingredientName,
      categoryId,
      unitId
    )
    IngredientCreated.validateQuantity(initialQuantity)

    super(ingredientId, metadata)
  }

  get eventName(): string {
    return 'IngredientCreated'
  }

  protected getPayload(): Record<string, any> {
    return {
      ingredientId: this.ingredientId,
      userId: this.userId,
      ingredientName: this.ingredientName,
      categoryId: this.categoryId,
      initialQuantity: this.initialQuantity,
      unitId: this.unitId,
    }
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
   * 初期数量のバリデーション
   */
  private static validateQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('初期数量は0より大きい必要があります')
    }
  }
}
