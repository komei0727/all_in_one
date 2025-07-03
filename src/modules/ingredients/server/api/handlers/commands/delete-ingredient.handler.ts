import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { DeleteIngredientCommand } from '../../../application/commands/delete-ingredient.command'
import { ValidationException } from '../../../domain/exceptions'

import type { DeleteIngredientHandler } from '../../../application/commands/delete-ingredient.handler'

/**
 * DeleteIngredientリクエストの型定義
 */
interface DeleteIngredientRequest {
  id: string
}

/**
 * 食材削除APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class DeleteIngredientApiHandler extends BaseApiHandler<DeleteIngredientRequest, void> {
  constructor(private readonly deleteIngredientHandler: DeleteIngredientHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * 食材IDの形式を検証
   */
  validate(data: unknown): DeleteIngredientRequest {
    // dataはparams.id、params.ingredientId、またはingredientIdを含むオブジェクト
    const params = data as {
      ingredientId?: string
      id?: string
      params?: { ingredientId?: string; id?: string }
    }

    // idの取得（複数の可能性を考慮）
    const id =
      params.ingredientId || params.id || params.params?.ingredientId || params.params?.id || ''

    // 食材IDの形式をバリデーション
    // IDが空の場合
    if (!id) {
      throw new ValidationException('食材IDは必須です')
    }

    // 食材ID形式のバリデーション（ing_プレフィックス付き）
    const ingredientIdRegex = /^ing_[0-9a-z]{24,}$/
    if (!ingredientIdRegex.test(id)) {
      throw new ValidationException('無効なIDフォーマットです')
    }

    return { id }
  }

  /**
   * ビジネスロジックの実行
   * 食材を削除する処理
   */
  async execute(request: DeleteIngredientRequest, userId: string): Promise<void> {
    // コマンドを作成
    const command = new DeleteIngredientCommand(request.id, userId)

    // ハンドラーを実行
    await this.deleteIngredientHandler.execute(command)
  }
}
