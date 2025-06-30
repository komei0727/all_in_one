import { UpdateIngredientCommand } from '../../../application/commands/update-ingredient.command'
import { ValidationException } from '../../../domain/exceptions'
import { updateIngredientSchema } from '../../validators/update-ingredient.validator'

import type { UpdateIngredientHandler } from '../../../application/commands/update-ingredient.handler'
import type { IngredientDto } from '../../../application/dtos/ingredient.dto'
import type { UpdateIngredientRequest } from '../../validators/update-ingredient.validator'

/**
 * 食材更新APIハンドラー
 */
export class UpdateIngredientApiHandler {
  constructor(private readonly updateIngredientHandler: UpdateIngredientHandler) {}

  /**
   * HTTPリクエストを処理して更新された食材情報を返す
   */
  async handle(
    body: unknown,
    ingredientId: string,
    userId: string
  ): Promise<ReturnType<IngredientDto['toJSON']>> {
    // リクエストボディのバリデーション
    const validationResult = updateIngredientSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      throw new ValidationException(firstError?.message || 'リクエストボディが不正です')
    }

    const request = validationResult.data as UpdateIngredientRequest

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
      ingredientId,
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

    return result.toJSON()
  }
}
