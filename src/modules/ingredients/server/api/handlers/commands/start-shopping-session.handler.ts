import { ZodError } from 'zod'

import { StartShoppingSessionCommand } from '../../../application/commands/start-shopping-session.command'
import { ValidationException } from '../../../domain/exceptions'
import { DeviceType, ShoppingLocation } from '../../../domain/value-objects'
import {
  type StartShoppingSessionRequest,
  startShoppingSessionSchema,
} from '../../validators/start-shopping-session.validator'

import type { StartShoppingSessionHandler } from '../../../application/commands/start-shopping-session.handler'

/**
 * 買い物セッション開始APIハンドラー
 * HTTPリクエストを受け取り、アプリケーション層のコマンドハンドラーを呼び出す
 */
export class StartShoppingSessionApiHandler {
  constructor(private readonly commandHandler: StartShoppingSessionHandler) {}

  /**
   * 買い物セッション開始リクエストを処理
   * @param request 買い物セッション開始リクエスト
   * @returns 作成されたセッションの情報
   * @throws {ValidationException} バリデーションエラー
   * @throws {BusinessRuleException} ビジネスルール違反（既存アクティブセッション等）
   */
  async handle(request: StartShoppingSessionRequest) {
    try {
      // リクエストのバリデーション
      const validatedRequest = startShoppingSessionSchema.parse(request)

      // deviceTypeの変換
      let deviceType: DeviceType | undefined
      if (validatedRequest.deviceType) {
        deviceType = DeviceType.fromString(validatedRequest.deviceType)
      }

      // locationの変換
      let location: ShoppingLocation | undefined
      if (validatedRequest.location) {
        location = ShoppingLocation.create({
          latitude: validatedRequest.location.latitude,
          longitude: validatedRequest.location.longitude,
          name: validatedRequest.location.address,
        })
      }

      // コマンドの作成
      const command = new StartShoppingSessionCommand(validatedRequest.userId, deviceType, location)

      // コマンドハンドラーの実行
      const dto = await this.commandHandler.handle(command)

      // レスポンスの返却（DTOをJSON形式に変換）
      return {
        sessionId: dto.sessionId,
        userId: dto.userId,
        status: dto.status,
        startedAt: dto.startedAt,
        completedAt: dto.completedAt,
        deviceType: dto.deviceType,
        location: dto.location,
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        throw new ValidationException(messages || 'リクエストが無効です')
      }
      throw error
    }
  }
}
