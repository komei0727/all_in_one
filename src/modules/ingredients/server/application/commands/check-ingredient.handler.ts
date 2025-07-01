import { type CheckIngredientCommand } from './check-ingredient.command'
import { BusinessRuleException, NotFoundException } from '../../domain/exceptions'
import { ExpiryCheckService, StockCalculationService } from '../../domain/services'
import {
  CheckedItem,
  ExpiryStatus,
  IngredientId,
  ShoppingSessionId,
  StockStatus,
} from '../../domain/value-objects'
import { CheckedItemDto } from '../dtos/checked-item.dto'
import { ShoppingSessionDto } from '../dtos/shopping-session.dto'

import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'

/**
 * 食材確認ハンドラー
 * 買い物セッション中に食材をチェックする
 */
export class CheckIngredientHandler {
  constructor(
    private readonly sessionRepository: ShoppingSessionRepository,
    private readonly ingredientRepository: IngredientRepository
  ) {}

  /**
   * 食材を確認してセッションに追加
   * @param command 食材確認コマンド
   * @returns 更新されたセッションのDTO
   */
  async handle(command: CheckIngredientCommand): Promise<ShoppingSessionDto> {
    // セッションを取得
    const sessionId = new ShoppingSessionId(command.sessionId)
    const session = await this.sessionRepository.findById(sessionId)

    if (!session) {
      throw new NotFoundException('買い物セッション', command.sessionId)
    }

    // 権限チェック（セッション所有者）
    if (session.getUserId() !== command.userId) {
      throw new BusinessRuleException('このセッションで食材を確認する権限がありません')
    }

    // セッションがアクティブかチェック
    if (!session.isActive()) {
      throw new BusinessRuleException('アクティブでないセッションで食材を確認することはできません')
    }

    // 食材を取得
    const ingredientId = new IngredientId(command.ingredientId)
    const ingredient = await this.ingredientRepository.findById(command.userId, ingredientId)

    if (!ingredient) {
      throw new NotFoundException('食材', command.ingredientId)
    }

    // 権限チェック（食材所有者）
    if (ingredient.getUserId() !== command.userId) {
      throw new BusinessRuleException('この食材を確認する権限がありません')
    }

    // 既にチェック済みかどうか確認
    const isAlreadyChecked = session
      .getCheckedItems()
      .some((item) => item.getIngredientId().equals(ingredientId))

    if (isAlreadyChecked) {
      throw new BusinessRuleException('この食材は既にチェック済みです')
    }

    // 在庫状態を判定
    const stockService = new StockCalculationService()
    const stockStatus = stockService.calculateStockStatus(ingredient)

    // 期限状態を判定
    const expiryService = new ExpiryCheckService()
    const expiryStatus = expiryService.checkExpiryStatus(ingredient)

    // チェック済みアイテムを作成
    const checkedItem = CheckedItem.create({
      ingredientId: ingredient.getId(),
      ingredientName: ingredient.getName(),
      stockStatus: this.mapToStockStatusVO(stockStatus),
      expiryStatus: this.mapToExpiryStatusVO(expiryStatus),
    })

    // セッションに食材を追加
    session.checkIngredient(checkedItem)

    // 更新を永続化
    const updatedSession = await this.sessionRepository.update(session)

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

    // DTOに変換して返す
    return new ShoppingSessionDto(
      updatedSession.getId().getValue(),
      updatedSession.getUserId(),
      updatedSession.getStatus().getValue(),
      updatedSession.getStartedAt().toISOString(),
      updatedSession.getCompletedAt()?.toISOString() ?? null,
      null, // deviceType - TODO: 将来実装
      null, // location - TODO: 将来実装
      checkedItemDtos
    )
  }

  /**
   * 在庫状態をStockStatus値オブジェクトにマッピング
   */
  private mapToStockStatusVO(status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'): StockStatus {
    switch (status) {
      case 'IN_STOCK':
        return StockStatus.IN_STOCK
      case 'LOW_STOCK':
        return StockStatus.LOW_STOCK
      case 'OUT_OF_STOCK':
        return StockStatus.OUT_OF_STOCK
    }
  }

  /**
   * 期限状態をExpiryStatus値オブジェクトにマッピング
   */
  private mapToExpiryStatusVO(
    status: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED'
  ): ExpiryStatus {
    switch (status) {
      case 'FRESH':
        return ExpiryStatus.FRESH
      case 'NEAR_EXPIRY':
        return ExpiryStatus.NEAR_EXPIRY
      case 'EXPIRING_SOON':
        return ExpiryStatus.EXPIRING_SOON
      case 'CRITICAL':
        return ExpiryStatus.CRITICAL
      case 'EXPIRED':
        return ExpiryStatus.EXPIRED
    }
  }
}
