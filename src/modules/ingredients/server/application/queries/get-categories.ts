import { CategoryRepository } from '../../domain/repositories/category-repository.interface'

/**
 * カテゴリー一覧取得クエリの結果DTO
 */
export interface GetCategoriesResult {
  categories: Array<{
    id: string
    name: string
    displayOrder: number
  }>
}

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
  async execute(): Promise<GetCategoriesResult> {
    // リポジトリからアクティブなカテゴリーを取得
    const categories = await this.categoryRepository.findAllActive()

    // エンティティをDTOに変換
    return {
      categories: categories.map((category) => category.toJSON()),
    }
  }
}
