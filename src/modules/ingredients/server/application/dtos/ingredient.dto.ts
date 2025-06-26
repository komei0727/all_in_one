/**
 * 食材DTOクラス
 * APIレスポンスとして返す食材情報を保持する
 */
export class IngredientDto {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly category: {
      id: string
      name: string
    } | null,
    public readonly price: number | null,
    public readonly purchaseDate: string,
    public readonly expiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    } | null,
    public readonly stock: {
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
      threshold: number | null
    },
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
        userId: this.userId,
        name: this.name,
        category: this.category,
        price: this.price,
        purchaseDate: this.purchaseDate,
        expiryInfo: this.expiryInfo,
        stock: this.stock,
        memo: this.memo,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      },
    }
  }
}
