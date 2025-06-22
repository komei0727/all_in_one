import { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import { CategoryListDTO } from '../dtos/category/category-list.dto'
import { CategoryMapper } from '../mappers/category.mapper'

/**
 * カテゴリー一覧取得クエリの結果
 * @deprecated Use CategoryListDTO instead
 */
export type GetCategoriesResult = CategoryListDTO

/**
 * GetCategoriesQueryHandler
 *
 * カテゴリー一覧を取得するクエリハンドラー
 * CQRSパターンにおけるQuery側の実装
 */
export class GetCategoriesQueryHandler {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  /**
   * クエリを実行してカテゴリー一覧を取得
   * @returns カテゴリー一覧のDTO
   */
  async execute(): Promise<CategoryListDTO> {
    // リポジトリからアクティブなカテゴリーを取得
    const categories = await this.categoryRepository.findAllActive()

    // エンティティをDTOに変換
    return CategoryMapper.toListDTO(categories)
  }
}
