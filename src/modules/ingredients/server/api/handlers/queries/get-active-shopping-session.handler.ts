import { type ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { type GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'
import { GetActiveShoppingSessionQuery } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.query'
import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

/**
 * GetActiveShoppingSessionリクエストの型定義
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GetActiveShoppingSessionRequest {
  // GETリクエストのため、特別なパラメータはなし
}

/**
 * アクティブな買い物セッション取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetActiveShoppingSessionApiHandler extends BaseApiHandler<
  GetActiveShoppingSessionRequest,
  ShoppingSessionDto | null
> {
  constructor(private readonly getActiveShoppingSessionHandler: GetActiveShoppingSessionHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * このAPIでは特別なバリデーションは不要
   */
  validate(_data: unknown): GetActiveShoppingSessionRequest {
    return {}
  }

  /**
   * ビジネスロジックの実行
   * アクティブなセッションの取得処理
   */
  async execute(
    request: GetActiveShoppingSessionRequest,
    userId: string
  ): Promise<ShoppingSessionDto | null> {
    // クエリを作成して実行
    const query = new GetActiveShoppingSessionQuery(userId)
    const sessionDto = await this.getActiveShoppingSessionHandler.handle(query)

    // セッションが見つからない場合はnullを返す（404エラーではなく正常なレスポンスとして扱う）
    return sessionDto
  }
}
