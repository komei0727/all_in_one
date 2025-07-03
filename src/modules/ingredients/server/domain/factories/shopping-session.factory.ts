import { ShoppingSession } from '../entities/shopping-session.entity'
import { ActiveShoppingSessionExistsException } from '../exceptions'
import {
  ShoppingSessionId,
  SessionStatus,
  type DeviceType,
  type ShoppingLocation,
} from '../value-objects'

import type { ShoppingSessionRepository } from '../repositories/shopping-session-repository.interface'

/**
 * 買い物セッションファクトリ
 * 買い物セッションの生成とビジネスルールの検証を担当
 */
export class ShoppingSessionFactory {
  constructor(private readonly repository: ShoppingSessionRepository) {}

  /**
   * 新しい買い物セッションを作成
   * @param userId ユーザーID
   * @param options オプション（deviceType、location）
   * @returns 作成されたセッション
   * @throws {ActiveShoppingSessionExistsException} アクティブなセッションが既に存在する場合
   */
  async create(
    userId: string,
    options?: {
      deviceType?: DeviceType
      location?: ShoppingLocation
    }
  ): Promise<ShoppingSession> {
    // アクティブなセッションの重複チェック
    const activeSession = await this.repository.findActiveByUserId(userId)
    if (activeSession) {
      throw new ActiveShoppingSessionExistsException()
    }

    // 新しいセッションを作成
    const id = ShoppingSessionId.create()
    const session = new ShoppingSession({
      id,
      userId,
      startedAt: new Date(),
      status: SessionStatus.ACTIVE,
      checkedItems: [],
      deviceType: options?.deviceType,
      location: options?.location,
      isNew: true, // 新規作成フラグを設定
    })

    return session
  }

  /**
   * 重複チェックを行ってセッションを作成（createのエイリアス）
   * @param userId ユーザーID
   * @param options オプション（deviceType、location）
   * @returns 作成されたセッション
   */
  async createWithCheck(
    userId: string,
    options?: {
      deviceType?: DeviceType
      location?: ShoppingLocation
    }
  ): Promise<ShoppingSession> {
    return this.create(userId, options)
  }
}
