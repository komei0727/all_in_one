import { type GetActiveShoppingSessionQuery } from './get-active-shopping-session.query'
import { CheckedItemDto } from '../dtos/checked-item.dto'
import { ShoppingSessionDto } from '../dtos/shopping-session.dto'

import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'

/**
 * アクティブな買い物セッション取得ハンドラー
 */
export class GetActiveShoppingSessionHandler {
  constructor(private readonly sessionRepository: ShoppingSessionRepository) {}

  /**
   * ユーザーのアクティブなセッションを取得する
   * @param query アクティブセッション取得クエリ
   * @returns セッションDTO（存在しない場合はnull）
   */
  async handle(query: GetActiveShoppingSessionQuery): Promise<ShoppingSessionDto | null> {
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

    // DTOに変換して返す
    return new ShoppingSessionDto(
      activeSession.getId().getValue(),
      activeSession.getUserId(),
      activeSession.getStatus().getValue(),
      activeSession.getStartedAt().toISOString(),
      activeSession.getCompletedAt()?.toISOString() ?? null,
      null, // deviceType - TODO: 将来実装
      null, // location - TODO: 将来実装
      checkedItemDtos
    )
  }
}
