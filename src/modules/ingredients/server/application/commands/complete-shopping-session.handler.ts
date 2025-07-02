import { type CompleteShoppingSessionCommand } from './complete-shopping-session.command'
import { BusinessRuleException, NotFoundException } from '../../domain/exceptions'
import { ShoppingSessionId } from '../../domain/value-objects'
import { CheckedItemDto } from '../dtos/checked-item.dto'
import { ShoppingSessionDto } from '../dtos/shopping-session.dto'

import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'

/**
 * 買い物セッション完了ハンドラー
 */
export class CompleteShoppingSessionHandler {
  constructor(private readonly sessionRepository: ShoppingSessionRepository) {}

  /**
   * 買い物セッションを完了する
   * @param command セッション完了コマンド
   * @returns 完了したセッションのDTO
   */
  async handle(command: CompleteShoppingSessionCommand): Promise<ShoppingSessionDto> {
    // セッションを取得
    const sessionId = new ShoppingSessionId(command.sessionId)
    const session = await this.sessionRepository.findById(sessionId)

    if (!session) {
      throw new NotFoundException('買い物セッション', command.sessionId)
    }

    // 権限チェック
    if (session.getUserId() !== command.userId) {
      throw new BusinessRuleException('このセッションを完了する権限がありません')
    }

    // セッションを完了
    session.complete()

    // 更新を永続化
    const updatedSession = await this.sessionRepository.update(session)

    // DTOに変換して返す
    // チェック済みアイテムをDTOに変換
    const checkedItemDtos = updatedSession
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

    return new ShoppingSessionDto(
      updatedSession.getId().getValue(),
      updatedSession.getUserId(),
      updatedSession.getStatus().getValue(),
      updatedSession.getStartedAt().toISOString(),
      updatedSession.getCompletedAt()?.toISOString() ?? null,
      updatedSession.getDeviceType()?.getValue() ?? null,
      updatedSession.getLocation()
        ? {
            latitude: updatedSession.getLocation()!.getLatitude(),
            longitude: updatedSession.getLocation()!.getLongitude(),
            placeName: updatedSession.getLocationName() ?? undefined,
          }
        : null,
      checkedItemDtos
    )
  }
}
