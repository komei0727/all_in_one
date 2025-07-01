import { ShoppingSession } from '@/modules/ingredients/server/domain/entities/shopping-session.entity'
import {
  ShoppingSessionId,
  SessionStatus,
  type CheckedItem,
  type DeviceType,
  type ShoppingLocation,
} from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers, faker } from '../faker.config'

interface ShoppingSessionProps {
  id: ShoppingSessionId
  userId: string
  startedAt: Date
  status: SessionStatus
  checkedItems: CheckedItem[]
  completedAt: Date | null
  deviceType?: DeviceType | null
  location?: ShoppingLocation | null
  isNew?: boolean
}

/**
 * ShoppingSession エンティティのテストデータビルダー
 */
export class ShoppingSessionBuilder extends BaseBuilder<ShoppingSessionProps, ShoppingSession> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      id: ShoppingSessionId.create(),
      userId: testDataHelpers.userId(),
      startedAt: faker.date.recent({ days: 1 }),
      status: SessionStatus.ACTIVE,
      checkedItems: [],
      completedAt: null,
      isNew: false, // デフォルトは既存エンティティとして扱う
    }
  }

  /**
   * IDを設定
   */
  withId(id: string | ShoppingSessionId): this {
    const sessionId = typeof id === 'string' ? new ShoppingSessionId(id) : id
    return this.with('id', sessionId)
  }

  /**
   * 新規生成されたIDを設定
   */
  withGeneratedId(): this {
    return this.with('id', ShoppingSessionId.create())
  }

  /**
   * ユーザーIDを設定
   */
  withUserId(userId: string): this {
    return this.with('userId', userId)
  }

  /**
   * 開始日時を設定
   */
  withStartedAt(date: Date): this {
    return this.with('startedAt', date)
  }

  /**
   * ステータスを設定
   */
  withStatus(status: SessionStatus): this {
    return this.with('status', status)
  }

  /**
   * アクティブステータスを設定
   */
  withActiveStatus(): this {
    return this.with('status', SessionStatus.ACTIVE)
  }

  /**
   * 完了ステータスを設定
   */
  withCompletedStatus(): this {
    return this.with('status', SessionStatus.COMPLETED)
  }

  /**
   * 中断ステータスを設定
   */
  withAbandonedStatus(): this {
    return this.with('status', SessionStatus.ABANDONED)
  }

  /**
   * 確認済み食材を設定
   */
  withCheckedItems(items: CheckedItem[]): this {
    return this.with('checkedItems', items)
  }

  /**
   * 確認済み食材を追加
   */
  addCheckedItem(item: CheckedItem): this {
    const currentItems = this.props.checkedItems || []
    return this.with('checkedItems', [...currentItems, item])
  }

  /**
   * 完了日時を設定
   */
  withCompletedAt(date: Date | null): this {
    return this.with('completedAt', date)
  }

  /**
   * セッションを完了状態にする
   */
  asCompleted(): this {
    return this.withCompletedStatus().withCompletedAt(faker.date.recent({ days: 1 }))
  }

  /**
   * セッションを中断状態にする
   */
  asAbandoned(): this {
    return this.withAbandonedStatus().withCompletedAt(faker.date.recent({ days: 1 }))
  }

  /**
   * 新規作成フラグを設定
   */
  withIsNew(isNew: boolean): this {
    return this.with('isNew', isNew)
  }

  /**
   * デバイスタイプを設定
   */
  withDeviceType(deviceType: DeviceType | null): this {
    return this.with('deviceType', deviceType)
  }

  /**
   * 位置情報を設定
   */
  withLocation(location: ShoppingLocation | null): this {
    return this.with('location', location)
  }

  build(): ShoppingSession {
    return new ShoppingSession(this.props as ShoppingSessionProps)
  }
}
