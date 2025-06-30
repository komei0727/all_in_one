import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'

import { User, type NextAuthUser } from '../entities/user.entity'
import { EmailAlreadyExistsException } from '../exceptions'
import { UserProfile } from '../value-objects/user-profile.vo'
import { UserStatus } from '../value-objects/user-status.vo'

import type { UserRepository } from '../repositories/user.repository'

/**
 * ユーザーファクトリ
 * NextAuthユーザーからドメインユーザーを作成する責務を持つ
 */
export class UserFactory {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * NextAuthユーザーからドメインユーザーを作成
   * @param nextAuthUser NextAuthユーザー情報
   * @returns 作成されたドメインユーザー
   * @throws EmailAlreadyExistsException メールアドレスが既に使用されている場合
   */
  async fromNextAuthUser(nextAuthUser: NextAuthUser): Promise<User> {
    // デフォルトプロフィールを作成
    const profile = UserProfile.createDefault(nextAuthUser.name || nextAuthUser.email)
    return this.createUser(nextAuthUser, profile)
  }

  /**
   * NextAuthユーザーからカスタムプロフィール付きでドメインユーザーを作成
   * @param nextAuthUser NextAuthユーザー情報
   * @param profile カスタムプロフィール
   * @returns 作成されたドメインユーザー
   * @throws EmailAlreadyExistsException メールアドレスが既に使用されている場合
   */
  async fromNextAuthUserWithProfile(
    nextAuthUser: NextAuthUser,
    profile: UserProfile
  ): Promise<User> {
    return this.createUser(nextAuthUser, profile)
  }

  /**
   * ユーザー作成の共通処理
   * @param nextAuthUser NextAuthユーザー情報
   * @param profile ユーザープロフィール
   * @returns 作成されたドメインユーザー
   * @throws EmailAlreadyExistsException メールアドレスが既に使用されている場合
   */
  private async createUser(nextAuthUser: NextAuthUser, profile: UserProfile): Promise<User> {
    // メールアドレスの重複チェック
    const email = new Email(nextAuthUser.email)
    const existingUser = await this.userRepository.findByEmail(email)
    if (existingUser) {
      throw new EmailAlreadyExistsException(nextAuthUser.email)
    }

    // 新規ユーザーを作成
    const now = new Date()
    const userId = UserId.generate()

    const user = new User({
      id: userId,
      nextAuthId: nextAuthUser.id,
      email,
      profile,
      status: UserStatus.createActive(),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    })

    // ドメインイベントを発行
    user.publishCreatedEvent()

    return user
  }
}
