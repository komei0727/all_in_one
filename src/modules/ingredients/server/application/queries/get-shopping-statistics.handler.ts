import type { GetShoppingStatisticsQuery } from './get-shopping-statistics.query'
import type {
  ShoppingQueryService,
  ShoppingStatistics,
} from '../query-services/shopping-query-service.interface'

/**
 * 買い物統計取得ハンドラー
 */
export class GetShoppingStatisticsHandler {
  constructor(private readonly queryService: ShoppingQueryService) {}

  /**
   * 買い物統計を取得
   * @param query 取得クエリ
   * @returns 買い物統計
   */
  async handle(query: GetShoppingStatisticsQuery): Promise<ShoppingStatistics> {
    // デフォルト値は30日
    const periodDays = query.periodDays ?? 30

    return this.queryService.getShoppingStatistics(query.userId, periodDays)
  }
}
