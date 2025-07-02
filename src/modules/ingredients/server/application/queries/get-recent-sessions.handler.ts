import type { GetRecentSessionsQuery } from './get-recent-sessions.query'
import type { ShoppingSessionDto } from '../dtos/shopping-session.dto'
import type { ShoppingQueryService } from '../query-services/shopping-query-service.interface'

/**
 * 買い物セッション履歴取得ハンドラー
 */
export class GetRecentSessionsHandler {
  constructor(private readonly queryService: ShoppingQueryService) {}

  /**
   * セッション履歴を取得
   * @param query 取得クエリ
   * @returns セッション履歴のDTO配列
   */
  async handle(query: GetRecentSessionsQuery): Promise<ShoppingSessionDto[]> {
    // デフォルト値は10件
    const limit = query.limit ?? 10

    return this.queryService.getRecentSessions(query.userId, limit)
  }
}
