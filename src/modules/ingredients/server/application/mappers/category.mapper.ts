import { Category } from '../../domain/entities/category.entity'
import { CategoryListDTO } from '../dtos/category-list.dto'
import { CategoryDTO } from '../dtos/category.dto'

/**
 * カテゴリマッパー
 *
 * ドメインエンティティとDTOの相互変換を行う
 */
export class CategoryMapper {
  /**
   * ドメインエンティティからDTOへ変換
   */
  static toDTO(category: Category): CategoryDTO {
    return new CategoryDTO(
      category.id.getValue(),
      category.name.getValue(),
      category.displayOrder.getValue()
    )
  }

  /**
   * ドメインエンティティの配列からリストDTOへ変換
   */
  static toListDTO(categories: Category[]): CategoryListDTO {
    const categoryDTOs = categories.map((category) => this.toDTO(category))
    return new CategoryListDTO(categoryDTOs)
  }
}
