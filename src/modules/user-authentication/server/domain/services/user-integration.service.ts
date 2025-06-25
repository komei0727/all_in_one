import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'

import { User, NextAuthUser } from '../entities/user.entity'
import { UserRepository } from '../repositories/user.repository'
import { UserProfile } from '../value-objects/user-profile.vo'

/**
 * ユーザー統合サービス
 * NextAuthとドメインユーザーの統合を担当するドメインサービス
 */
export class UserIntegrationService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * NextAuthユーザーからドメインユーザーを作成または更新
   * @param nextAuthUser NextAuthユーザー情報
   * @returns 作成または更新されたドメインユーザー
   */
  async createOrUpdateFromNextAuth(nextAuthUser: NextAuthUser): Promise<User> {
    // 既存のドメインユーザーを検索
    const existingUser = await this.userRepository.findByNextAuthId(nextAuthUser.id)

    if (existingUser) {
      // 既存ユーザーの場合は同期して返す
      existingUser.syncWithNextAuth(nextAuthUser)
      return await this.userRepository.save(existingUser)
    }

    // 新規ユーザーの場合、メールアドレスの重複チェック
    const emailExists = await this.userRepository.existsByEmail(new Email(nextAuthUser.email))
    if (emailExists) {
      throw new Error('メールアドレスが既に使用されています')
    }

    // 新規ドメインユーザーを作成
    const newUser = User.createFromNextAuth(nextAuthUser)
    return await this.userRepository.save(newUser)
  }

  /**
   * 認証成功時の処理
   * @param nextAuthId NextAuth ID
   * @returns ログイン記録が更新されたユーザー
   */
  async handleSuccessfulAuthentication(nextAuthId: string): Promise<User> {
    const user = await this.userRepository.findByNextAuthId(nextAuthId)

    if (!user) {
      throw new Error('ユーザーが見つかりません')
    }

    if (!user.canLogin()) {
      throw new Error('アカウントが無効化されています')
    }

    // ログインを記録
    user.recordLogin()

    return await this.userRepository.save(user)
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
      throw new Error('ユーザーが見つかりません')
    }

    if (!user.isActive()) {
      throw new Error('無効化されたユーザーのプロフィールは更新できません')
    }

    user.updateProfile(profile)

    return await this.userRepository.save(user)
  }

  /**
   * ユーザーを無効化
   * @param userId ユーザーID
   * @returns 無効化されたユーザー
   */
  async deactivateUser(userId: UserId): Promise<User> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new Error('ユーザーが見つかりません')
    }

    if (!user.isActive()) {
      throw new Error('既に無効化されたユーザーです')
    }

    user.deactivate()

    return await this.userRepository.save(user)
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
}
