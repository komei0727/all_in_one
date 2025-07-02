import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { CheckIngredientCommand } from '../../../application/commands/check-ingredient.command'
import { checkIngredientSchema } from '../../validators/check-ingredient.validator'

import type { CheckIngredientHandler } from '../../../application/commands/check-ingredient.handler'
import type { z } from 'zod'

// CheckIngredientRequestの型定義
export type CheckIngredientRequest = z.infer<typeof checkIngredientSchema>

/**
 * 食材確認APIハンドラー
 * BaseApiHandlerを継承して統一的な例外変換とエラーハンドリングを提供
 */
export class CheckIngredientApiHandler extends BaseApiHandler<
  CheckIngredientRequest,
  { data: unknown }
> {
  constructor(private readonly commandHandler: CheckIngredientHandler) {
    super()
  }

  /**
   * リクエストデータのバリデーション
   * @param data バリデーション対象のデータ（URLパラメータ + ユーザーID）
   * @returns バリデーション済みのリクエストデータ
   */
  validate(data: unknown): CheckIngredientRequest {
    return checkIngredientSchema.parse(data)
  }

  /**
   * 食材確認のビジネスロジックを実行
   * @param request バリデーション済みのリクエストデータ
   * @param userId 認証済みユーザーID（validateで検証済み）
   * @returns 実行結果
   */
  async execute(request: CheckIngredientRequest, _userId: string): Promise<{ data: unknown }> {
    // コマンドを作成してアプリケーション層のハンドラーに委譲
    const command = new CheckIngredientCommand(
      request.sessionId,
      request.ingredientId,
      request.userId
    )

    const result = await this.commandHandler.handle(command)

    // 一貫性のためにdataプロパティでラップして返却
    return { data: result }
  }
}
