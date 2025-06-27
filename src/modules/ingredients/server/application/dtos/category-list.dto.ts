import type { CategoryDTO } from './category.dto'

/**
 * カテゴリ一覧DTO
 *
 * カテゴリ一覧APIのレスポンスで使用するデータ転送オブジェクト
 */
export class CategoryListDTO {
  constructor(public readonly categories: CategoryDTO[]) {}

  /**
   * JSONシリアライズ用のオブジェクトを返す
   */
  toJSON(): {
    categories: {
      id: string
      name: string
      displayOrder: number
    }[]
  } {
    return {
      categories: this.categories.map((category) => category.toJSON()),
    }
  }
}
