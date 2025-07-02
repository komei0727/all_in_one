import type { GetIngredientCheckStatisticsQuery } from './get-ingredient-check-statistics.query'
import type {
  ShoppingQueryService,
  IngredientCheckStatistics,
} from '../query-services/shopping-query-service.interface'

/**
 * 食材チェック統計取得ハンドラー
 */
export class GetIngredientCheckStatisticsHandler {
  constructor(private readonly queryService: ShoppingQueryService) {}

  /**
   * 食材チェック統計を取得
   * @param query 取得クエリ
   * @returns 食材チェック統計リスト
   */
  async handle(query: GetIngredientCheckStatisticsQuery): Promise<IngredientCheckStatistics[]> {
    return this.queryService.getIngredientCheckStatistics(query.userId, query.ingredientId)
  }
}
