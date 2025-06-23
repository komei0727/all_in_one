/**
 * 食材DTOクラス
 * APIレスポンスとして返す食材情報を保持する
 */
export class IngredientDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly category: {
      id: string
      name: string
    } | null,
    public readonly currentStock: {
      quantity: number
      unit: {
        id: string
        name: string
        symbol: string
      }
      storageLocation: {
        type: string
        detail: string | null
      }
      bestBeforeDate: string | null
      expiryDate: string | null
      purchaseDate: string
      price: number | null
      isInStock: boolean
    } | null,
    public readonly memo: string | null,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {}

  /**
   * DTOをJSON形式に変換
   * @returns JSON形式の食材情報
   */
  toJSON() {
    return {
      ingredient: {
        id: this.id,
        name: this.name,
        category: this.category,
        currentStock: this.currentStock,
        memo: this.memo,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      },
    }
  }
}
