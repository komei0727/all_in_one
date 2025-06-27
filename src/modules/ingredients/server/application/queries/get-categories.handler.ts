import { CategoryListDTO } from '../dtos/category-list.dto'
import { CategoryDTO } from '../dtos/category.dto'

import type { GetCategoriesQuery } from './get-categories.query'
import type { CategoryRepository } from '../../domain/repositories/category-repository.interface'

/**
 * GetCategoriesQueryHandler
 *
 * カテゴリー一覧を取得するクエリハンドラー
 * クエリオブジェクトに基づいて処理を実行
 */
export class GetCategoriesQueryHandler {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  /**
   * クエリを実行してカテゴリー一覧を取得
   * @param query 取得条件を含むクエリオブジェクト
   * @returns カテゴリー一覧のDTO
   */
  async handle(query: GetCategoriesQuery): Promise<CategoryListDTO> {
    // アクティブなカテゴリーを取得
    const categories = await this.categoryRepository.findAllActive()

    // DTOに変換
    const categoryDTOs = categories.map(
      (category) =>
        new CategoryDTO(category.getId(), category.getName(), category.getDisplayOrder())
    )

    // ソート処理
    if (query.sortBy === 'name') {
      categoryDTOs.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    } else {
      // デフォルトはdisplayOrder順（既にソート済みの場合が多い）
      categoryDTOs.sort((a, b) => a.displayOrder - b.displayOrder)
    }

    return new CategoryListDTO(categoryDTOs)
  }
}
