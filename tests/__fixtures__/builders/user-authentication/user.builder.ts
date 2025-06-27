import { faker } from '@faker-js/faker/locale/ja'

import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'

import { testDataHelpers } from '../faker.config'

/**
 * ユーザーテストデータビルダー
 * Faker.jsを使用して現実的なテストデータを生成
 */
export class UserTestDataBuilder {
  private id: string = testDataHelpers.userId()
  private nextAuthId: string = faker.string.uuid()
  private email: string = faker.internet.email()
  private displayName: string | null = faker.person.fullName()
  private timezone: string = 'Asia/Tokyo'
  private language: 'ja' | 'en' = 'ja'
  private status: 'ACTIVE' | 'DEACTIVATED' = 'ACTIVE'
  private lastLoginAt: Date | null = faker.date.recent()
  private createdAt: Date = faker.date.past()
  private updatedAt: Date = faker.date.recent()

  /**
   * IDを設定
   */
  withId(id: string): this {
    this.id = id
    return this
  }

  /**
   * NextAuthIDを設定
   */
  withNextAuthId(nextAuthId: string): this {
    this.nextAuthId = nextAuthId
    return this
  }

  /**
   * メールアドレスを設定
   */
  withEmail(email: string): this {
    this.email = email
    return this
  }

  /**
   * 表示名を設定
   */
  withDisplayName(displayName: string | null): this {
    this.displayName = displayName
    return this
  }

  /**
   * タイムゾーンを設定
   */
  withTimezone(timezone: string): this {
    this.timezone = timezone
    return this
  }

  /**
   * 言語を設定
   */
  withLanguage(language: 'ja' | 'en'): this {
    this.language = language
    return this
  }

  /**
   * ステータスを設定
   */
  withStatus(status: 'ACTIVE' | 'DEACTIVATED'): this {
    this.status = status
    return this
  }

  /**
   * 最終ログイン日時を設定
   */
  withLastLoginAt(lastLoginAt: Date | null): this {
    this.lastLoginAt = lastLoginAt
    return this
  }

  /**
   * 作成日時を設定
   */
  withCreatedAt(createdAt: Date): this {
    this.createdAt = createdAt
    return this
  }

  /**
   * 更新日時を設定
   */
  withUpdatedAt(updatedAt: Date): this {
    this.updatedAt = updatedAt
    return this
  }

  /**
   * アクティブユーザーとして設定
   */
  asActive(): this {
    this.status = 'ACTIVE'
    this.lastLoginAt = faker.date.recent({ days: 7 })
    return this
  }

  /**
   * 非アクティブユーザーとして設定
   */
  asDeactivated(): this {
    this.status = 'DEACTIVATED'
    this.lastLoginAt = faker.date.past({ years: 1 })
    return this
  }

  /**
   * 新規ユーザーとして設定
   */
  asNewUser(): this {
    const now = new Date()
    this.createdAt = now
    this.updatedAt = now
    this.lastLoginAt = null
    return this
  }

  /**
   * ドメインエンティティに変換
   */
  toDomainEntity(): User {
    const preferences = UserPreferences.createDefault()
    const profile = new UserProfile({
      displayName: this.displayName || '',
      timezone: this.timezone,
      language: this.language,
      preferences,
    })
    const status =
      this.status === 'ACTIVE' ? UserStatus.createActive() : UserStatus.createDeactivated()

    return new User({
      id: new UserId(this.id),
      nextAuthId: this.nextAuthId,
      email: new Email(this.email),
      profile,
      status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
    })
  }

  /**
   * プレーンオブジェクトとして構築
   */
  build(): {
    id: string
    nextAuthId: string
    email: string
    displayName: string | null
    timezone: string
    language: 'ja' | 'en'
    status: 'ACTIVE' | 'DEACTIVATED'
    lastLoginAt: Date | null
    createdAt: Date
    updatedAt: Date
  } {
    return {
      id: this.id,
      nextAuthId: this.nextAuthId,
      email: this.email,
      displayName: this.displayName,
      timezone: this.timezone,
      language: this.language,
      status: this.status,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}

/**
 * ユーザーテストデータを作成
 */
export function createUserTestData(): UserTestDataBuilder {
  return new UserTestDataBuilder()
}

/**
 * 複数のユーザーテストデータを作成
 */
export function createMultipleUserTestData(count: number): UserTestDataBuilder[] {
  return Array.from({ length: count }, () => new UserTestDataBuilder())
}
