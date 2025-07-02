import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { CreateIngredientCommand } from '../../../application/commands/create-ingredient.command'
import { type IngredientDto } from '../../../application/dtos/ingredient.dto'
import { type StorageType } from '../../../domain/value-objects'
import {
  type CreateIngredientRequest,
  createIngredientSchema,
} from '../../validators/create-ingredient.validator'

import type { CreateIngredientHandler } from '../../../application/commands/create-ingredient.handler'

/**
 * 食材作成APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class CreateIngredientApiHandler extends BaseApiHandler<
  CreateIngredientRequest,
  IngredientDto
> {
  constructor(private readonly commandHandler: CreateIngredientHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * Zodスキーマを使用して食材作成リクエストを検証
   */
  validate(data: unknown): CreateIngredientRequest {
    return createIngredientSchema.parse(data)
  }

  /**
   * ビジネスロジックの実行
   * 食材を作成する処理
   */
  async execute(request: CreateIngredientRequest, userId: string): Promise<IngredientDto> {
    // コマンドの作成
    const command = new CreateIngredientCommand({
      userId, // 認証されたユーザーのIDを使用
      name: request.name,
      categoryId: request.categoryId,
      quantity: {
        amount: request.quantity.amount,
        unitId: request.quantity.unitId,
      },
      storageLocation: {
        type: request.storageLocation.type as StorageType,
        detail: request.storageLocation.detail,
      },
      threshold: request.threshold,
      expiryInfo: request.expiryInfo,
      purchaseDate: request.purchaseDate,
      price: request.price,
      memo: request.memo,
    })

    // コマンドハンドラーの実行（すでにDTOが返される）
    const dto = await this.commandHandler.execute(command)

    return dto
  }
}
