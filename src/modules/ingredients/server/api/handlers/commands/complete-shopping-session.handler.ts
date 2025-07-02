import { type CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import { type ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { completeShoppingSessionValidator } from '../../validators/complete-shopping-session.validator'

/**
 * CompleteShoppingSessionリクエストの型定義
 */
interface CompleteShoppingSessionRequest {
  sessionId: string
}

/**
 * 買い物セッション完了APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class CompleteShoppingSessionApiHandler extends BaseApiHandler<
  CompleteShoppingSessionRequest,
  ShoppingSessionDto
> {
  constructor(private readonly completeShoppingSessionHandler: CompleteShoppingSessionHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * Zodスキーマを使用してsessionIdの形式を検証
   */
  validate(data: unknown): CompleteShoppingSessionRequest {
    // dataはparamsから渡されるsessionIdを含むオブジェクト
    const params = data as { sessionId?: string; params?: { sessionId: string } }

    // sessionIdのバリデーション
    return completeShoppingSessionValidator.parse({
      sessionId: params.sessionId || params.params?.sessionId || '',
    })
  }

  /**
   * ビジネスロジックの実行
   * 買い物セッションを完了する処理
   */
  async execute(
    request: CompleteShoppingSessionRequest,
    userId: string
  ): Promise<ShoppingSessionDto> {
    // コマンドハンドラーを実行
    const result = await this.completeShoppingSessionHandler.handle({
      sessionId: request.sessionId,
      userId,
    })

    // DTOが返される前提（CompleteShoppingSessionHandlerの戻り値がShoppingSessionDto）
    return result
  }
}
