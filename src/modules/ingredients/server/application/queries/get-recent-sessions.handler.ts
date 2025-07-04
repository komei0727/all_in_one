import type { GetRecentSessionsQuery } from './get-recent-sessions.query'
import type { RecentSessionsResult } from '../query-services/shopping-query-service.interface'
import type { ShoppingQueryService } from '../query-services/shopping-query-service.interface'

/**
 * 買い物セッション履歴取得ハンドラー
 */
export class GetRecentSessionsHandler {
  constructor(private readonly queryService: ShoppingQueryService) {}

  /**
   * セッション履歴を取得
   * @param query 取得クエリ
   * @returns セッション履歴とページネーション情報
   */
  async handle(query: GetRecentSessionsQuery): Promise<RecentSessionsResult> {
    // デフォルト値
    const limit = query.limit ?? 10
    const page = query.page ?? 1

    return this.queryService.getRecentSessions(query.userId, limit, page)
  }
}
