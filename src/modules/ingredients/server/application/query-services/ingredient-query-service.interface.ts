import type { IngredientDetailView } from '../views/ingredient-detail.view'

/**
 * 食材クエリサービスインターフェース
 * CQRSパターンの読み取り専用操作を定義
 * インフラストラクチャ層で実装される
 */
export interface IngredientQueryService {
  /**
   * ユーザーの食材詳細を取得する
   * @param userId - ユーザーID
   * @param ingredientId - 食材ID
   * @returns 食材詳細ビュー（見つからない場合null）
   */
  findDetailById(userId: string, ingredientId: string): Promise<IngredientDetailView | null>
}
