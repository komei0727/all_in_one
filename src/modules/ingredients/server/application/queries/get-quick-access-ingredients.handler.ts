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
   * @returns クイックアクセス食材リスト
   */
  async handle(query: GetQuickAccessIngredientsQuery): Promise<QuickAccessIngredient[]> {
    // デフォルト値は10件
    const limit = query.limit ?? 10

    return this.queryService.getQuickAccessIngredients(query.userId, limit)
  }
}
