import { Ingredient } from '../entities/ingredient.entity'
import {
  IngredientId,
  IngredientName,
  StorageType,
  StorageLocation,
  ExpiryInfo,
} from '../value-objects'

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
   * @param userId ユーザーID
   * @param id 食材ID
   * @returns 食材（見つからない場合はnull）
   */
  findById(userId: string, id: IngredientId): Promise<Ingredient | null>

  /**
   * 名前で食材を検索
   * @param userId ユーザーID
   * @param name 食材名
   * @returns 食材（見つからない場合はnull）
   */
  findByName(userId: string, name: IngredientName): Promise<Ingredient | null>

  /**
   * すべての食材を取得
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  findAll(userId: string): Promise<Ingredient[]>

  /**
   * 食材を削除
   * @param userId ユーザーID
   * @param id 削除する食材のID
   */
  delete(userId: string, id: IngredientId): Promise<void>

  /**
   * ユーザーIDで食材を検索
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  findByUserId(userId: string): Promise<Ingredient[]>

  /**
   * 期限切れ間近の食材を検索
   * @param userId ユーザーID
   * @param days 期限切れまでの日数
   * @returns 食材のリスト
   */
  findExpiringSoon(userId: string, days: number): Promise<Ingredient[]>

  /**
   * 期限切れの食材を検索
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  findExpired(userId: string): Promise<Ingredient[]>

  /**
   * カテゴリーで食材を検索
   * @param userId ユーザーID
   * @param categoryId カテゴリーID
   * @returns 食材のリスト
   */
  findByCategory(userId: string, categoryId: string): Promise<Ingredient[]>

  /**
   * 保存場所で食材を検索
   * @param userId ユーザーID
   * @param location 保存場所
   * @returns 食材のリスト
   */
  findByStorageLocation(userId: string, location: StorageType): Promise<Ingredient[]>

  /**
   * 在庫切れの食材を検索
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  findOutOfStock(userId: string): Promise<Ingredient[]>

  /**
   * 在庫不足の食材を検索
   * @param userId ユーザーID
   * @param threshold 閾値（省略時はthresholdの値を使用）
   * @returns 食材のリスト
   */
  findLowStock(userId: string, threshold?: number): Promise<Ingredient[]>

  /**
   * 重複チェック（同じユーザー、名前、期限情報、保存場所）
   * @param userId ユーザーID
   * @param name 食材名
   * @param expiryInfo 期限情報
   * @param location 保存場所
   * @returns 存在する場合はtrue
   */
  existsByUserAndNameAndExpiryAndLocation(
    userId: string,
    name: IngredientName,
    expiryInfo: ExpiryInfo | null,
    location: StorageLocation
  ): Promise<boolean>

  /**
   * 条件付きで食材を検索
   * @param criteria 検索条件
   * @returns 食材のリスト
   */
  findMany(criteria: {
    userId?: string
    page: number
    limit: number
    search?: string
    categoryId?: string
    expiryStatus?: 'all' | 'expired' | 'expiring' | 'fresh'
    sortBy?: 'name' | 'purchaseDate' | 'expiryDate' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Ingredient[]>

  /**
   * 条件に一致する食材の総数を取得
   * @param criteria カウント条件
   * @returns 食材の総数
   */
  count(criteria: {
    userId?: string
    search?: string
    categoryId?: string
    expiryStatus?: 'all' | 'expired' | 'expiring' | 'fresh'
  }): Promise<number>
}
