import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { StartShoppingSessionCommand } from '../../../application/commands/start-shopping-session.command'
import { type ShoppingSessionDto } from '../../../application/dtos/shopping-session.dto'
import { DeviceType, ShoppingLocation } from '../../../domain/value-objects'
import {
  type StartShoppingSessionRequest,
  startShoppingSessionSchema,
} from '../../validators/start-shopping-session.validator'

import type { StartShoppingSessionHandler } from '../../../application/commands/start-shopping-session.handler'

/**
 * 買い物セッション開始APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class StartShoppingSessionApiHandler extends BaseApiHandler<
  StartShoppingSessionRequest,
  ShoppingSessionDto
> {
  constructor(private readonly commandHandler: StartShoppingSessionHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * Zodスキーマを使用して買い物セッション開始リクエストを検証
   */
  validate(data: unknown): StartShoppingSessionRequest {
    return startShoppingSessionSchema.parse(data)
  }

  /**
   * ビジネスロジックの実行
   * 買い物セッションを開始する処理
   */
  async execute(request: StartShoppingSessionRequest, userId: string): Promise<ShoppingSessionDto> {
    // deviceTypeの変換
    let deviceType: DeviceType | undefined
    if (request.deviceType) {
      deviceType = DeviceType.fromString(request.deviceType)
    }

    // locationの変換
    let location: ShoppingLocation | undefined
    if (request.location) {
      location = ShoppingLocation.create({
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        name: request.location.name,
      })
    }

    // コマンドの作成（認証されたuserIdを使用）
    const command = new StartShoppingSessionCommand(userId, deviceType, location)

    // コマンドハンドラーの実行
    const dto = await this.commandHandler.handle(command)

    return dto
  }
}
