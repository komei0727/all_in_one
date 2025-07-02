import type { GetSessionHistoryQuery } from './get-session-history.query'
import type {
  SessionHistoryResult,
  ShoppingQueryService,
} from '../query-services/shopping-query-service.interface'

/**
 * 買い物セッション履歴取得ハンドラー
 */
export class GetSessionHistoryHandler {
  constructor(private readonly shoppingQueryService: ShoppingQueryService) {}

  /**
   * 買い物セッション履歴を取得する
   * @param query クエリオブジェクト
   * @returns セッション履歴とページネーション情報
   */
  async handle(query: GetSessionHistoryQuery): Promise<SessionHistoryResult> {
    // ShoppingQueryServiceのgetSessionHistoryメソッドを呼び出す
    return this.shoppingQueryService.getSessionHistory(query.userId, {
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
      status: query.status,
    })
  }
}
