/**
 * 食材確認レスポンスDTOクラス
 * 買い物セッション中に確認された食材の詳細情報を返す
 */
export class CheckIngredientResponseDto {
  constructor(
    public readonly sessionId: string,
    public readonly ingredientId: string,
    public readonly ingredientName: string,
    public readonly categoryId: string | null,
    public readonly stockStatus: string,
    public readonly expiryStatus: string | null,
    public readonly currentQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    },
    public readonly threshold: number | null,
    public readonly checkedAt: string
  ) {}

  /**
   * DTOをJSON形式に変換
   * @returns JSON形式の食材確認結果
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      ingredientId: this.ingredientId,
      ingredientName: this.ingredientName,
      categoryId: this.categoryId,
      stockStatus: this.stockStatus,
      expiryStatus: this.expiryStatus,
      currentQuantity: this.currentQuantity,
      threshold: this.threshold,
      checkedAt: this.checkedAt,
    }
  }
}
