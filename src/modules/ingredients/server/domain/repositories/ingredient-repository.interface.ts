import { Ingredient } from '../entities/ingredient.entity'
import { IngredientId, IngredientName } from '../value-objects'

/**
 * 食材リポジトリインターフェース
 * 食材の永続化に関する操作を定義
 */
export interface IngredientRepository {
  /**
   * 食材を保存
   * @param ingredient 保存する食材
   * @returns 保存された食材
   */
  save(ingredient: Ingredient): Promise<Ingredient>

  /**
   * IDで食材を検索
   * @param id 食材ID
   * @returns 食材（見つからない場合はnull）
   */
  findById(id: IngredientId): Promise<Ingredient | null>

  /**
   * 名前で食材を検索
   * @param name 食材名
   * @returns 食材（見つからない場合はnull）
   */
  findByName(name: IngredientName): Promise<Ingredient | null>

  /**
   * すべての食材を取得
   * @returns 食材のリスト
   */
  findAll(): Promise<Ingredient[]>

  /**
   * 食材を削除
   * @param id 削除する食材のID
   */
  delete(id: IngredientId): Promise<void>
}
