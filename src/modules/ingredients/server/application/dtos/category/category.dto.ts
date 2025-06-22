/**
 * カテゴリDTO
 *
 * APIレスポンスで使用するカテゴリのデータ転送オブジェクト
 */
export class CategoryDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly displayOrder: number
  ) {}

  /**
   * JSONシリアライズ用のオブジェクトを返す
   */
  toJSON(): {
    id: string
    name: string
    displayOrder: number
  } {
    return {
      id: this.id,
      name: this.name,
      displayOrder: this.displayOrder,
    }
  }
}
