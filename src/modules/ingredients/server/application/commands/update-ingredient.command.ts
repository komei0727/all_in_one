/**
 * 食材更新コマンド
 */
export class UpdateIngredientCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name?: string,
    public readonly categoryId?: string,
    public readonly memo?: string | null,
    public readonly price?: number | null,
    public readonly purchaseDate?: Date,
    public readonly expiryInfo?: {
      bestBeforeDate: Date | null
      useByDate: Date | null
    } | null,
    public readonly stock?: {
      quantity: number
      unitId: string
      storageLocation: {
        type: 'ROOM_TEMPERATURE' | 'REFRIGERATED' | 'FROZEN'
        detail: string | null
      }
      threshold: number | null
    }
  ) {}
}
