import { Category } from '../entities/category.entity'
import { CategoryId } from '../value-objects'

/**
 * CategoryRepository Interface
 *
 * カテゴリーエンティティの永続化を担当するリポジトリのインターフェース
 * Domain層で定義し、Infrastructure層で実装する（依存性逆転の原則）
 */
export interface CategoryRepository {
  /**
   * アクティブなカテゴリーを表示順で取得
   * @returns カテゴリーエンティティの配列
   */
  findAllActive(): Promise<Category[]>

  /**
   * IDによるカテゴリーの取得
   * @param id カテゴリーID
   * @returns カテゴリーエンティティ、存在しない場合はnull
   */
  findById(id: CategoryId): Promise<Category | null>
}
