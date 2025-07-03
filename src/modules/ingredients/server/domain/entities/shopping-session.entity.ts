import { AggregateRoot } from '@/modules/shared/server/domain/entities/aggregate-root.base'

import {
  ShoppingSessionStarted,
  ItemChecked,
  ShoppingSessionCompleted,
  ShoppingSessionAbandoned,
} from '../events'
import { BusinessRuleException, SessionAlreadyCompletedException } from '../exceptions'
import {
  type ShoppingSessionId,
  SessionStatus,
  CheckedItem,
  type IngredientId,
  type IngredientName,
  type StockStatus,
  type ExpiryStatus,
  type DeviceType,
  type ShoppingLocation,
} from '../value-objects'

/**
 * 買い物セッションエンティティ
 * 買い物モードでの活動を記録する集約ルート
 */
export class ShoppingSession extends AggregateRoot {
  private readonly id: ShoppingSessionId
  private readonly userId: string
  private readonly startedAt: Date
  private completedAt: Date | null
  private status: SessionStatus
  private checkedItems: CheckedItem[]
  private readonly deviceType: DeviceType | null
  private readonly location: ShoppingLocation | null

  constructor(params: {
    id: ShoppingSessionId
    userId: string
    startedAt: Date
    status: SessionStatus
    checkedItems: CheckedItem[]
    completedAt?: Date | null
    deviceType?: DeviceType | null
    location?: ShoppingLocation | null
    isNew?: boolean // 新規作成フラグ
  }) {
    super()
    this.id = params.id
    this.userId = params.userId
    this.startedAt = params.startedAt
    this.status = params.status
    this.checkedItems = params.checkedItems
    this.completedAt = params.completedAt ?? null
    this.deviceType = params.deviceType ?? null
    this.location = params.location ?? null

    // 新規作成の場合はイベントを発行
    if (params.isNew) {
      this.addDomainEvent(
        new ShoppingSessionStarted(
          this.id.getValue(),
          this.userId,
          this.startedAt,
          {
            userId: this.userId,
          },
          this.deviceType ?? undefined,
          this.location ?? undefined
        )
      )
    }
  }

  /**
   * IDを取得
   */
  getId(): ShoppingSessionId {
    return this.id
  }

  /**
   * ユーザーIDを取得
   */
  getUserId(): string {
    return this.userId
  }

  /**
   * 開始日時を取得
   */
  getStartedAt(): Date {
    return this.startedAt
  }

  /**
   * 完了日時を取得
   */
  getCompletedAt(): Date | null {
    return this.completedAt
  }

  /**
   * ステータスを取得
   */
  getStatus(): SessionStatus {
    return this.status
  }

  /**
   * 確認済み食材リストを取得
   */
  getCheckedItems(): CheckedItem[] {
    return [...this.checkedItems]
  }

  /**
   * デバイスタイプを取得
   */
  getDeviceType(): DeviceType | null {
    return this.deviceType
  }

  /**
   * 位置情報を取得
   */
  getLocation(): ShoppingLocation | null {
    return this.location
  }

  /**
   * セッションがアクティブかどうか
   */
  isActive(): boolean {
    return this.status.isActive()
  }

  /**
   * モバイルデバイスを使用しているかどうか
   */
  isUsingMobileDevice(): boolean {
    return this.deviceType?.isMobile() ?? false
  }

  /**
   * 位置情報が設定されているかどうか
   */
  hasLocation(): boolean {
    return this.location !== null
  }

  /**
   * 位置情報の名前を取得
   */
  getLocationName(): string | null {
    return this.location?.getName() ?? null
  }

  /**
   * 食材を確認する
   * @param params 確認する食材の情報
   * @throws {BusinessRuleException} セッションがアクティブでない場合
   */
  checkItem(params: {
    ingredientId: IngredientId
    ingredientName: IngredientName
    stockStatus: StockStatus
    expiryStatus: ExpiryStatus
  }): void {
    // アクティブなセッションでのみ食材確認可能
    if (!this.isActive()) {
      throw new BusinessRuleException('アクティブでないセッションでは食材を確認できません')
    }

    // 確認済み食材を作成
    const checkedItem = CheckedItem.create({
      ingredientId: params.ingredientId,
      ingredientName: params.ingredientName,
      stockStatus: params.stockStatus,
      expiryStatus: params.expiryStatus,
    })

    // 同じ食材が既に確認されている場合は更新
    const existingIndex = this.checkedItems.findIndex((item) =>
      item.getIngredientId().equals(params.ingredientId)
    )

    if (existingIndex >= 0) {
      // 既存の確認を更新
      this.checkedItems[existingIndex] = checkedItem
    } else {
      // 新規追加
      this.checkedItems.push(checkedItem)
    }

    // 食材確認イベントを発行
    this.addDomainEvent(
      new ItemChecked(
        this.id.getValue(),
        params.ingredientId.getValue(),
        params.ingredientName.getValue(),
        params.stockStatus.getValue(),
        params.expiryStatus.getValue(),
        checkedItem.getCheckedAt(),
        { userId: this.userId }
      )
    )
  }

  /**
   * 食材を確認する（重複チェック版）
   * @param checkedItem 確認済みアイテム
   * @throws {BusinessRuleException} セッションがアクティブでない場合、または既にチェック済みの場合
   */
  checkIngredient(checkedItem: CheckedItem): void {
    // アクティブなセッションでのみ食材確認可能
    if (!this.isActive()) {
      throw new BusinessRuleException('アクティブでないセッションでは食材を確認できません')
    }

    // 同じ食材が既に確認されている場合はエラー
    const isAlreadyChecked = this.checkedItems.some((item) =>
      item.getIngredientId().equals(checkedItem.getIngredientId())
    )

    if (isAlreadyChecked) {
      throw new BusinessRuleException('この食材は既にチェック済みです')
    }

    // 新規追加
    this.checkedItems.push(checkedItem)

    // 食材確認イベントを発行
    this.addDomainEvent(
      new ItemChecked(
        this.id.getValue(),
        checkedItem.getIngredientId().getValue(),
        checkedItem.getIngredientName().getValue(),
        checkedItem.getStockStatus().getValue(),
        checkedItem.getExpiryStatus().getValue(),
        checkedItem.getCheckedAt(),
        { userId: this.userId }
      )
    )
  }

  /**
   * セッションを完了する
   * @throws {BusinessRuleException} セッションがアクティブでない場合
   */
  complete(): void {
    if (!this.isActive()) {
      // 既に完了済みの場合は専用例外、その他の場合は一般的なビジネスルール例外
      if (this.status.isCompleted()) {
        throw new SessionAlreadyCompletedException(this.id.getValue())
      } else {
        throw new BusinessRuleException('アクティブでないセッションは完了できません')
      }
    }

    this.status = SessionStatus.COMPLETED
    this.completedAt = new Date()

    // セッション完了イベントを発行
    this.addDomainEvent(
      new ShoppingSessionCompleted(
        this.id.getValue(),
        this.userId,
        this.getDuration(),
        this.getCheckedItemsCount(),
        { userId: this.userId }
      )
    )
  }

  /**
   * セッションを中断する
   * @param reason 中断理由
   * @throws {BusinessRuleException} セッションがアクティブでない場合
   */
  abandon(reason = 'user-action'): void {
    if (!this.isActive()) {
      throw new BusinessRuleException('アクティブでないセッションは中断できません')
    }

    this.status = SessionStatus.ABANDONED
    this.completedAt = new Date()

    // セッション中断イベントを発行
    this.addDomainEvent(
      new ShoppingSessionAbandoned(this.id.getValue(), this.userId, this.getDuration(), reason, {
        userId: this.userId,
      })
    )
  }

  /**
   * セッションの継続時間を取得（ミリ秒）
   */
  getDuration(): number {
    const endTime = this.completedAt || new Date()
    return endTime.getTime() - this.startedAt.getTime()
  }

  /**
   * 確認済み食材の数を取得
   */
  getCheckedItemsCount(): number {
    return this.checkedItems.length
  }

  /**
   * 注意が必要な食材（在庫不足、期限切れ間近など）を取得
   */
  getNeedsAttentionItems(): CheckedItem[] {
    return this.checkedItems.filter((item) => item.needsAttention())
  }
}
