import { DeleteIngredientCommand } from '../../../application/commands/delete-ingredient.command'
import { ValidationException } from '../../../domain/exceptions'

import type { DeleteIngredientHandler } from '../../../application/commands/delete-ingredient.handler'

/**
 * 食材削除APIハンドラー
 */
export class DeleteIngredientApiHandler {
  constructor(private readonly deleteIngredientHandler: DeleteIngredientHandler) {}

  /**
   * HTTPリクエストを処理して食材を削除する
   */
  async handle(params: { id: string }, userId: string): Promise<void> {
    // UUID形式のバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      throw new ValidationException('無効なIDフォーマットです')
    }

    // コマンドを作成
    const command = new DeleteIngredientCommand(params.id, userId)

    // ハンドラーを実行
    await this.deleteIngredientHandler.execute(command)
  }
}
