import { BaseBuilder } from '../base.builder'
import { faker } from '../faker.config'
import { EmailBuilder } from '../value-objects/email.builder'
import { UserIdBuilder } from '../value-objects/user-id.builder'
import { UserProfileBuilder } from '../value-objects/user-profile.builder'
import { UserStatusBuilder } from '../value-objects/user-status.builder'

interface UserEntityProps {
  id: { value: string }
  email: { value: string }
  profile: {
    displayName: string
    timezone: string
    language: string
    preferences: {
      theme: string
      notifications: boolean
      emailFrequency: string
    }
  }
  status: { status: string }
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
}

/**
 * Userエンティティビルダー
 * ユーザー集約ルートのテストデータを生成
 */
export class UserBuilder extends BaseBuilder<UserEntityProps> {
  constructor() {
    super()

    const now = new Date()

    // デフォルト値を設定（リアルなテストデータ生成）
    this.props = {
      id: new UserIdBuilder().build(),
      email: new EmailBuilder().build(),
      profile: new UserProfileBuilder().withDefaults().build(),
      status: new UserStatusBuilder().withActive().build(),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: now,
      lastLoginAt: faker.date.recent({ days: 30 }),
    }
  }

  /**
   * ユーザーIDを指定
   */
  withId(id: string): this {
    return this.with('id', { value: id })
  }

  /**
   * ユーザーIDをビルダーで指定
   */
  withIdBuilder(builder: UserIdBuilder): this {
    return this.with('id', builder.build())
  }

  /**
   * メールアドレスを指定
   */
  withEmail(email: string): this {
    return this.with('email', { value: email })
  }

  /**
   * メールアドレスをビルダーで指定
   */
  withEmailBuilder(builder: EmailBuilder): this {
    return this.with('email', builder.build())
  }

  /**
   * プロフィールをビルダーで指定
   */
  withProfileBuilder(builder: UserProfileBuilder): this {
    return this.with('profile', builder.build())
  }

  /**
   * ステータスをビルダーで指定
   */
  withStatusBuilder(builder: UserStatusBuilder): this {
    return this.with('status', builder.build())
  }

  /**
   * アクティブユーザーでビルド
   */
  withActiveUser(): this {
    return this.withStatusBuilder(new UserStatusBuilder().withActive()).withLastLoginAt(
      faker.date.recent({ days: 7 })
    )
  }

  /**
   * 無効化ユーザーでビルド
   */
  withDeactivatedUser(): this {
    return this.withStatusBuilder(new UserStatusBuilder().withDeactivated()).withLastLoginAt(null)
  }

  /**
   * 新規ユーザーでビルド（初回ログインなし）
   */
  withNewUser(): this {
    const now = new Date()
    return this.withCreatedAt(now).withUpdatedAt(now).withLastLoginAt(null)
  }

  /**
   * テスト用固定ユーザーでビルド
   */
  withTestUser(): this {
    return this.withId('usr_test_001')
      .withEmail('test@example.com')
      .withProfileBuilder(
        new UserProfileBuilder().withDisplayName('テスト ユーザー').withDefaults()
      )
  }

  /**
   * 作成日時を指定
   */
  withCreatedAt(createdAt: Date): this {
    return this.with('createdAt', createdAt)
  }

  /**
   * 更新日時を指定
   */
  withUpdatedAt(updatedAt: Date): this {
    return this.with('updatedAt', updatedAt)
  }

  /**
   * 最終ログイン日時を指定
   */
  withLastLoginAt(lastLoginAt: Date | null): this {
    return this.with('lastLoginAt', lastLoginAt)
  }

  /**
   * NextAuth統合用のユーザーでビルド
   */
  withNextAuthIntegration(nextAuthId: string): this {
    // NextAuthのIDをユーザーIDのプレフィックスとして使用
    return this.withId(`usr_${nextAuthId.slice(-8)}`) // 末尾8文字を使用
      .withEmailBuilder(new EmailBuilder().withGmail())
  }

  build(): UserEntityProps {
    return {
      id: this.props.id!,
      email: this.props.email!,
      profile: this.props.profile!,
      status: this.props.status!,
      createdAt: this.props.createdAt!,
      updatedAt: this.props.updatedAt!,
      lastLoginAt: this.props.lastLoginAt ?? null,
    }
  }
}
