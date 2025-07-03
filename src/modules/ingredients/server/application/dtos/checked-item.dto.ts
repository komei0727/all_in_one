/**
 * 確認済み食材DTOクラス
 * 買い物セッション中に確認された食材情報を保持する
 */
export class CheckedItemDto {
  constructor(
    public readonly ingredientId: string,
    public readonly ingredientName: string,
    public readonly stockStatus: string,
    public readonly expiryStatus: string | null,
    public readonly checkedAt: string
  ) {}

  /**
   * DTOをJSON形式に変換
   * @returns JSON形式の確認済み食材情報
   */
  toJSON() {
    return {
      ingredientId: this.ingredientId,
      ingredientName: this.ingredientName,
      stockStatus: this.stockStatus,
      expiryStatus: this.expiryStatus,
      checkedAt: this.checkedAt,
    }
  }
}
