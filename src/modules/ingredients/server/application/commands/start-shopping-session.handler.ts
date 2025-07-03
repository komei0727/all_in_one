import { type StartShoppingSessionCommand } from './start-shopping-session.command'
import { type ShoppingSessionFactory } from '../../domain/factories/shopping-session.factory'
import { ShoppingSessionDto } from '../dtos/shopping-session.dto'

import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'

/**
 * 買い物セッション開始ハンドラー
 */
export class StartShoppingSessionHandler {
  constructor(
    private readonly sessionFactory: ShoppingSessionFactory,
    private readonly sessionRepository: ShoppingSessionRepository
  ) {}

  /**
   * コマンドを処理して新しい買い物セッションを開始する
   * @param command 買い物セッション開始コマンド
   * @returns 作成されたセッションのDTO
   */
  async handle(command: StartShoppingSessionCommand): Promise<ShoppingSessionDto> {
    // ファクトリを使用して新しいセッションを作成（重複チェック含む）
    // deviceTypeとlocationがある場合はオプションとして渡す
    const options = {
      ...(command.deviceType && { deviceType: command.deviceType }),
      ...(command.location && { location: command.location }),
    }

    const session = await this.sessionFactory.create(
      command.userId,
      Object.keys(options).length > 0 ? options : undefined
    )

    // セッションを永続化
    const savedSession = await this.sessionRepository.save(session)

    // DTOに変換して返す（新規セッションなのでcheckedItemsは空配列）
    return new ShoppingSessionDto(
      savedSession.getId().getValue(),
      savedSession.getUserId(),
      savedSession.getStatus().getValue(),
      savedSession.getStartedAt().toISOString(),
      savedSession.getCompletedAt()?.toISOString() ?? null,
      savedSession.getDeviceType()?.getValue() ?? null,
      savedSession.getLocation()
        ? {
            latitude: savedSession.getLocation()!.getLatitude(),
            longitude: savedSession.getLocation()!.getLongitude(),
            name: savedSession.getLocationName() ?? undefined,
          }
        : null,
      [] // checkedItems - 新規セッションなので空
    )
  }
}
