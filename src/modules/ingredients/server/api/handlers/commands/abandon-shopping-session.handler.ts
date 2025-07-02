import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { AbandonShoppingSessionCommand } from '../../../application/commands/abandon-shopping-session.command'
import { abandonShoppingSessionValidator } from '../../validators/abandon-shopping-session.validator'

import type { AbandonShoppingSessionHandler } from '../../../application/commands/abandon-shopping-session.handler'
import type { ShoppingSessionDto } from '../../../application/dtos/shopping-session.dto'
import type { AbandonShoppingSessionRequest } from '../../validators/abandon-shopping-session.validator'

/**
 * セッション中断APIハンドラー
 * BaseApiHandlerを継承して統一的な例外変換とエラーハンドリングを提供
 */
export class AbandonShoppingSessionApiHandler extends BaseApiHandler<
  AbandonShoppingSessionRequest,
  ShoppingSessionDto
> {
  constructor(private readonly commandHandler: AbandonShoppingSessionHandler) {
    super()
  }

  /**
   * リクエストデータのバリデーション
   * @param data バリデーション対象のデータ（パスパラメータ + ボディデータ）
   * @returns バリデーション済みのリクエストデータ
   */
  validate(data: unknown): AbandonShoppingSessionRequest {
    return abandonShoppingSessionValidator.parse(data)
  }

  /**
   * セッション中断のビジネスロジックを実行
   * @param request バリデーション済みのリクエストデータ
   * @param userId 認証済みユーザーID
   * @returns セッションDTO
   */
  async execute(
    request: AbandonShoppingSessionRequest,
    userId: string
  ): Promise<ShoppingSessionDto> {
    // コマンドを作成してアプリケーション層のハンドラーに委譲
    const command = new AbandonShoppingSessionCommand(request.sessionId, userId, request.reason)
    const result = await this.commandHandler.handle(command)

    // DTOとして返却（BaseApiHandlerが統一的にHTTPレスポンスに変換）
    return result.toJSON().data as ShoppingSessionDto
  }
}
