/**
 * 単位DTO
 *
 * APIレスポンスで使用する単位のデータ転送オブジェクト
 */
export class UnitDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly symbol: string,
    public readonly displayOrder: number
  ) {}

  /**
   * JSONシリアライズ用のオブジェクトを返す
   */
  toJSON(): {
    id: string
    name: string
    symbol: string
    displayOrder: number
  } {
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      displayOrder: this.displayOrder,
    }
  }
}
