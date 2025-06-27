import { ZodError } from 'zod'

import { CreateIngredientCommand } from '../../../application/commands/create-ingredient.command'
import { IngredientMapper } from '../../../application/mappers/ingredient.mapper'
import { ValidationException } from '../../../domain/exceptions'
import { CategoryId, type StorageType, UnitId } from '../../../domain/value-objects'
import {
  type CreateIngredientRequest,
  createIngredientSchema,
} from '../../validators/create-ingredient.validator'

import type { CreateIngredientHandler } from '../../../application/commands/create-ingredient.handler'
import type { CategoryRepository } from '../../../domain/repositories/category-repository.interface'
import type { UnitRepository } from '../../../domain/repositories/unit-repository.interface'

/**
 * 食材作成APIハンドラー
 * HTTPリクエストを受け取り、アプリケーション層のコマンドハンドラーを呼び出す
 */
export class CreateIngredientApiHandler {
  constructor(
    private readonly commandHandler: CreateIngredientHandler,
    private readonly categoryRepository: CategoryRepository,
    private readonly unitRepository: UnitRepository
  ) {}

  /**
   * 食材作成リクエストを処理
   * @param request 食材作成リクエスト
   * @param userId 認証されたユーザーのID
   * @returns 作成された食材のDTO
   * @throws {ValidationException} バリデーションエラー
   */
  async handle(request: CreateIngredientRequest, userId: string) {
    try {
      // リクエストのバリデーション
      const validatedRequest = createIngredientSchema.parse(request)

      // コマンドの作成
      const command = new CreateIngredientCommand({
        userId, // 認証されたユーザーのIDを使用
        name: validatedRequest.name,
        categoryId: validatedRequest.categoryId,
        quantity: {
          amount: validatedRequest.quantity.amount,
          unitId: validatedRequest.quantity.unitId,
        },
        storageLocation: {
          type: validatedRequest.storageLocation.type as StorageType,
          detail: validatedRequest.storageLocation.detail,
        },
        threshold: validatedRequest.threshold,
        expiryInfo: validatedRequest.expiryInfo,
        purchaseDate: validatedRequest.purchaseDate,
        price: validatedRequest.price,
        memo: validatedRequest.memo,
      })

      // コマンドハンドラーの実行
      const ingredient = await this.commandHandler.execute(command)

      // 関連エンティティの取得
      const category = await this.categoryRepository.findById(
        CategoryId.create(validatedRequest.categoryId)
      )
      const unit = await this.unitRepository.findById(
        UnitId.create(ingredient.getIngredientStock().getUnitId().getValue())
      )

      // DTOへの変換
      const dto = IngredientMapper.toDto(ingredient, category || undefined, unit || undefined)

      // レスポンスの返却
      return dto.toJSON()
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        throw new ValidationException(messages || 'リクエストが無効です')
      }
      throw error
    }
  }
}
