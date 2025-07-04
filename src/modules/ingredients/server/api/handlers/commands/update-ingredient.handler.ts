import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { UpdateIngredientCommand } from '../../../application/commands/update-ingredient.command'
import { updateIngredientSchema } from '../../validators/update-ingredient.validator'

import type { UpdateIngredientHandler } from '../../../application/commands/update-ingredient.handler'
import type { IngredientDto } from '../../../application/dtos/ingredient.dto'
import type { UpdateIngredientRequest } from '../../validators/update-ingredient.validator'

/**
 * UpdateIngredientリクエストの拡張型定義
 * URLパラメータとボディを統合
 */
interface UpdateIngredientApiRequest extends UpdateIngredientRequest {
  ingredientId: string
}

/**
 * 食材更新APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class UpdateIngredientApiHandler extends BaseApiHandler<
  UpdateIngredientApiRequest,
  IngredientDto
> {
  constructor(private readonly updateIngredientHandler: UpdateIngredientHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * Zodスキーマを使用して食材更新リクエストを検証
   */
  validate(data: unknown): UpdateIngredientApiRequest {
    // dataはparams.ingredientIdとbodyが含まれるオブジェクト
    const params = data as { ingredientId?: string; params?: { ingredientId: string } } & Record<
      string,
      unknown
    >

    // ingredientIdの取得（idパラメータからも取得）
    const ingredientId = params.ingredientId || params.params?.ingredientId || params.id || ''

    // ボディのバリデーション
    const body = { ...params }
    delete body.ingredientId
    delete body.params
    delete body.id

    const validatedBody = updateIngredientSchema.parse(body)

    return {
      ...validatedBody,
      ingredientId: ingredientId as string,
    }
  }

  /**
   * ビジネスロジックの実行
   * 食材を更新する処理
   */
  async execute(request: UpdateIngredientApiRequest, userId: string): Promise<IngredientDto> {
    // 日付文字列をDateオブジェクトに変換
    const purchaseDate = request.purchaseDate ? new Date(request.purchaseDate) : undefined

    const expiryInfo =
      request.expiryInfo !== undefined
        ? request.expiryInfo
          ? {
              bestBeforeDate: request.expiryInfo.bestBeforeDate
                ? new Date(request.expiryInfo.bestBeforeDate)
                : null,
              useByDate: request.expiryInfo.useByDate
                ? new Date(request.expiryInfo.useByDate)
                : null,
            }
          : null
        : undefined

    // コマンドを作成
    const command = new UpdateIngredientCommand(
      request.ingredientId,
      userId,
      request.name,
      request.categoryId,
      request.memo,
      request.price,
      purchaseDate,
      expiryInfo,
      request.stock
        ? {
            quantity: request.stock.quantity,
            unitId: request.stock.unitId,
            storageLocation: {
              type: request.stock.storageLocation.type,
              detail: request.stock.storageLocation.detail || null,
            },
            threshold: request.stock.threshold || null,
          }
        : undefined
    )

    // ハンドラーを実行
    const result = await this.updateIngredientHandler.execute(command)

    return result
  }
}
