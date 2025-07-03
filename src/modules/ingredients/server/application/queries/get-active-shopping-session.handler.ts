import { type GetActiveShoppingSessionQuery } from './get-active-shopping-session.query'
import { ActiveShoppingSessionDto } from '../dtos/active-shopping-session.dto'
import { CheckedItemDto } from '../dtos/checked-item.dto'

import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'

/**
 * アクティブな買い物セッション取得ハンドラー
 */
export class GetActiveShoppingSessionHandler {
  constructor(private readonly sessionRepository: ShoppingSessionRepository) {}

  /**
   * ユーザーのアクティブなセッションを取得する
   * @param query アクティブセッション取得クエリ
   * @returns アクティブセッションDTO（存在しない場合はnull）
   */
  async handle(query: GetActiveShoppingSessionQuery): Promise<ActiveShoppingSessionDto | null> {
    // アクティブなセッションを検索
    const activeSession = await this.sessionRepository.findActiveByUserId(query.userId)

    if (!activeSession) {
      return null
    }

    // チェック済みアイテムをDTOに変換
    const checkedItemDtos = activeSession
      .getCheckedItems()
      .map(
        (item) =>
          new CheckedItemDto(
            item.getIngredientId().getValue(),
            item.getIngredientName().getValue(),
            item.getStockStatus().getValue(),
            item.getExpiryStatus()?.getValue() ?? null,
            item.getCheckedAt().toISOString()
          )
      )

    // 継続時間を計算（秒単位）
    const duration = Math.floor(
      (new Date().getTime() - activeSession.getStartedAt().getTime()) / 1000
    )

    // チェック済みアイテム数
    const checkedItemsCount = activeSession.getCheckedItems().length

    // 最終活動時刻（最後にチェックしたアイテムの時刻、なければセッション開始時刻）
    const lastActivityAt =
      checkedItemDtos.length > 0
        ? checkedItemDtos[checkedItemDtos.length - 1].checkedAt
        : activeSession.getStartedAt().toISOString()

    // ActiveShoppingSessionDTOに変換して返す
    // completedAtパラメータを削除（アクティブセッションなので常にnull）
    return new ActiveShoppingSessionDto(
      activeSession.getId().getValue(),
      activeSession.getUserId(),
      activeSession.getStatus().getValue(),
      activeSession.getStartedAt().toISOString(),
      activeSession.getDeviceType()?.getValue() ?? null,
      activeSession.getLocation()
        ? {
            latitude: activeSession.getLocation()!.getLatitude(),
            longitude: activeSession.getLocation()!.getLongitude(),
            name: activeSession.getLocationName() ?? undefined,
          }
        : null,
      checkedItemDtos,
      duration,
      checkedItemsCount,
      lastActivityAt
    )
  }
}
