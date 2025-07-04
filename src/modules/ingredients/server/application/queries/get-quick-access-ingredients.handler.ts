import type { GetQuickAccessIngredientsQuery } from './get-quick-access-ingredients.query'
import type {
  ShoppingQueryService,
  QuickAccessIngredient,
} from '../query-services/shopping-query-service.interface'

/**
 * クイックアクセス食材取得ハンドラー
 */
export class GetQuickAccessIngredientsHandler {
  constructor(private readonly queryService: ShoppingQueryService) {}

  /**
   * クイックアクセス食材を取得
   * @param query 取得クエリ
   * @returns クイックアクセス食材リスト（最近チェックと頻繁チェック）
   */
  async handle(query: GetQuickAccessIngredientsQuery): Promise<{
    recentlyChecked: QuickAccessIngredient[]
    frequentlyChecked: QuickAccessIngredient[]
  }> {
    // デフォルト値は20件
    const limit = query.limit ?? 20

    return this.queryService.getQuickAccessIngredients(query.userId, limit)
  }
}
