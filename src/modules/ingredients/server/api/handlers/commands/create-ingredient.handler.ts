import { ZodError } from 'zod'

import { CreateIngredientCommand } from '../../../application/commands/create-ingredient.command'
import { CreateIngredientHandler } from '../../../application/commands/create-ingredient.handler'
import { IngredientMapper } from '../../../application/mappers/ingredient.mapper'
import { ValidationException } from '../../../domain/exceptions/validation.exception'
import { CategoryRepository } from '../../../domain/repositories/category-repository.interface'
import { UnitRepository } from '../../../domain/repositories/unit-repository.interface'
import { CategoryId, StorageType, UnitId } from '../../../domain/value-objects'
import {
  CreateIngredientRequest,
  createIngredientSchema,
} from '../../validators/create-ingredient.validator'

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
   * @returns 作成された食材のDTO
   * @throws {ValidationException} バリデーションエラー
   */
  async handle(request: CreateIngredientRequest) {
    try {
      // リクエストのバリデーション
      const validatedRequest = createIngredientSchema.parse(request)

      // コマンドの作成（現在はハードコードされたユーザーIDを使用、将来的には認証機能から取得）
      // TODO: 認証機能実装後は、リクエストからユーザーIDを取得
      const command = new CreateIngredientCommand({
        userId: 'cmcay7j66000ev01fzbahrrsf', // 一時的にハードコード（シードデータのユーザーID）
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
        expiryInfo: validatedRequest.expiryInfo,
        purchaseDate: validatedRequest.purchaseDate,
        price: validatedRequest.price,
        memo: validatedRequest.memo,
      })

      // コマンドハンドラーの実行
      const ingredient = await this.commandHandler.execute(command)

      // 関連エンティティの取得（統合されたIngredientエンティティ対応）
      const category = await this.categoryRepository.findById(
        CategoryId.create(validatedRequest.categoryId)
      )
      const unit = await this.unitRepository.findById(
        UnitId.create(ingredient.getUnitId().getValue())
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
