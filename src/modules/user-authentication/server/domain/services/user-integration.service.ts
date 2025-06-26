import { DomainEventPublisher } from '@/modules/shared/server/domain/events/domain-event-publisher.interface'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'

import { User, NextAuthUser } from '../entities/user.entity'
import { NextAuthIntegrationFailedEvent } from '../events/nextauth-integration-failed.event'
import {
  UserNotFoundException,
  EmailAlreadyExistsException,
  AccountDeactivatedException,
  AlreadyDeactivatedException,
  ProfileUpdateNotAllowedException,
} from '../exceptions'
import { UserRepository } from '../repositories/user.repository'
import { UserProfile } from '../value-objects/user-profile.vo'

/**
 * ユーザー統合サービス
 * NextAuthとドメインユーザーの統合を担当するドメインサービス
 */
export class UserIntegrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventPublisher?: DomainEventPublisher
  ) {}

  /**
   * NextAuthユーザーからドメインユーザーを作成または更新
   * @param nextAuthUser NextAuthユーザー情報
   * @returns 作成または更新されたドメインユーザー
   */
  async createOrUpdateFromNextAuth(nextAuthUser: NextAuthUser): Promise<User> {
    try {
      // 既存のドメインユーザーを検索
      const existingUser = await this.userRepository.findByNextAuthId(nextAuthUser.id)

      if (existingUser) {
        // 既存ユーザーの場合は同期して返す
        existingUser.syncWithNextAuth(nextAuthUser)
        const savedUser = await this.userRepository.save(existingUser)

        // イベントを発行
        await this.publishEvents(savedUser)

        return savedUser
      }

      // 新規ユーザーの場合、メールアドレスの重複チェック
      const emailExists = await this.userRepository.existsByEmail(new Email(nextAuthUser.email))
      if (emailExists) {
        throw new EmailAlreadyExistsException(nextAuthUser.email)
      }

      // 新規ドメインユーザーを作成
      const newUser = User.createFromNextAuth(nextAuthUser)
      const savedUser = await this.userRepository.save(newUser)

      // イベントを発行
      await this.publishEvents(savedUser)

      return savedUser
    } catch (error) {
      // 統合失敗イベントを発行
      if (this.eventPublisher) {
        await this.eventPublisher.publish(
          new NextAuthIntegrationFailedEvent(
            nextAuthUser.id,
            nextAuthUser.email,
            'USER_CREATION_FAILED',
            error instanceof Error ? error.message : '不明なエラー',
            { error: error instanceof Error ? error.stack : undefined }
          )
        )
      }
      throw error
    }
  }

  /**
   * 認証成功時の処理
   * @param nextAuthId NextAuth ID
   * @returns ログイン記録が更新されたユーザー
   */
  async handleSuccessfulAuthentication(nextAuthId: string): Promise<User> {
    const user = await this.userRepository.findByNextAuthId(nextAuthId)

    if (!user) {
      throw new UserNotFoundException({ nextAuthId })
    }

    if (!user.canLogin()) {
      throw new AccountDeactivatedException(user.getId().getValue())
    }

    // ログインを記録
    user.recordLogin()

    const savedUser = await this.userRepository.save(user)

    // イベントを発行
    await this.publishEvents(savedUser)

    return savedUser
  }

  /**
   * ユーザープロフィールを更新
   * @param userId ユーザーID
   * @param profile 新しいプロフィール
   * @returns 更新されたユーザー
   */
  async updateUserProfile(userId: UserId, profile: UserProfile): Promise<User> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundException({ userId: userId.getValue() })
    }

    if (!user.isActive()) {
      throw new ProfileUpdateNotAllowedException(userId.getValue())
    }

    user.updateProfile(profile)

    const savedUser = await this.userRepository.save(user)

    // イベントを発行
    await this.publishEvents(savedUser)

    return savedUser
  }

  /**
   * ユーザーを無効化
   * @param userId ユーザーID
   * @param reason 無効化理由
   * @param deactivatedBy 実行者ID
   * @returns 無効化されたユーザー
   */
  async deactivateUser(
    userId: UserId,
    reason: 'USER_REQUEST' | 'ADMIN_ACTION' | 'POLICY_VIOLATION' | 'DATA_RETENTION',
    deactivatedBy: string
  ): Promise<User> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new UserNotFoundException({ userId: userId.getValue() })
    }

    if (!user.isActive()) {
      throw new AlreadyDeactivatedException(userId.getValue())
    }

    user.deactivate(reason, deactivatedBy)

    const savedUser = await this.userRepository.save(user)

    // イベントを発行
    await this.publishEvents(savedUser)

    return savedUser
  }

  /**
   * メールアドレスでユーザーを検索
   * @param email メールアドレス
   * @returns ユーザー、見つからない場合はnull
   */
  async findUserByEmail(email: Email): Promise<User | null> {
    return await this.userRepository.findByEmail(email)
  }

  /**
   * ユーザーIDでユーザーを検索
   * @param userId ユーザーID
   * @returns ユーザー、見つからない場合はnull
   */
  async findUserById(userId: UserId): Promise<User | null> {
    return await this.userRepository.findById(userId)
  }

  /**
   * NextAuth IDでユーザーを検索
   * @param nextAuthId NextAuth ID
   * @returns ユーザー、見つからない場合はnull
   */
  async findUserByNextAuthId(nextAuthId: string): Promise<User | null> {
    return await this.userRepository.findByNextAuthId(nextAuthId)
  }

  /**
   * アクティブなユーザー一覧を取得
   * @param limit 取得件数の上限
   * @param offset オフセット
   * @returns アクティブなユーザー一覧
   */
  async getActiveUsers(limit = 100, offset = 0): Promise<User[]> {
    return await this.userRepository.findActiveUsers(limit, offset)
  }

  /**
   * 指定期間内のアクティブユーザー数を取得
   * @param days 期間（日数）
   * @returns アクティブユーザー数
   */
  async getActiveUserCount(days: number): Promise<number> {
    return await this.userRepository.countActiveUsersInPeriod(days)
  }

  /**
   * ユーザーのイベントを発行
   * @param user イベントを持つユーザー
   */
  private async publishEvents(user: User): Promise<void> {
    if (!this.eventPublisher) {
      return
    }

    const events = user.domainEvents
    if (events.length > 0) {
      await this.eventPublisher.publishAll(events)
      user.clearEvents()
    }
  }
}
