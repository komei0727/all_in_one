import { BaseBuilder } from '../base.builder'
import { faker } from '../faker.config'

interface UserPreferencesProps {
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
  emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never'
}

interface UserProfileProps {
  displayName: string
  timezone: string
  language: 'ja' | 'en'
  preferences: UserPreferencesProps
}

/**
 * UserPreferencesビルダー
 * ユーザー設定値オブジェクトのテストデータを生成
 */
export class UserPreferencesBuilder extends BaseBuilder<UserPreferencesProps> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      theme: faker.helpers.arrayElement(['light', 'dark', 'auto'] as const),
      notifications: faker.datatype.boolean(),
      emailFrequency: faker.helpers.arrayElement(['daily', 'weekly', 'monthly', 'never'] as const)
    }
  }

  /**
   * テーマ設定
   */
  withTheme(theme: 'light' | 'dark' | 'auto'): this {
    return this.with('theme', theme)
  }

  /**
   * 通知設定
   */
  withNotifications(enabled: boolean): this {
    return this.with('notifications', enabled)
  }

  /**
   * メール頻度設定
   */
  withEmailFrequency(frequency: 'daily' | 'weekly' | 'monthly' | 'never'): this {
    return this.with('emailFrequency', frequency)
  }

  /**
   * デフォルト設定でビルド
   */
  withDefaults(): this {
    return this
      .withTheme('light')
      .withNotifications(true)
      .withEmailFrequency('weekly')
  }

  build(): UserPreferencesProps {
    return {
      theme: this.props.theme!,
      notifications: this.props.notifications!,
      emailFrequency: this.props.emailFrequency!
    }
  }
}

/**
 * UserProfileビルダー
 * ユーザープロフィール値オブジェクトのテストデータを生成
 */
export class UserProfileBuilder extends BaseBuilder<UserProfileProps> {
  constructor() {
    super()
    // デフォルト値を設定（日本語ロケール対応）
    this.props = {
      displayName: faker.person.fullName(),
      timezone: 'Asia/Tokyo',
      language: 'ja' as const,
      preferences: new UserPreferencesBuilder().build()
    }
  }

  /**
   * 表示名設定
   */
  withDisplayName(displayName: string): this {
    return this.with('displayName', displayName)
  }

  /**
   * 日本語名でビルド
   */
  withJapaneseName(): this {
    const lastName = faker.person.lastName()
    const firstName = faker.person.firstName()
    return this.with('displayName', `${lastName} ${firstName}`)
  }

  /**
   * タイムゾーン設定
   */
  withTimezone(timezone: string): this {
    return this.with('timezone', timezone)
  }

  /**
   * 言語設定
   */
  withLanguage(language: 'ja' | 'en'): this {
    return this.with('language', language)
  }

  /**
   * ユーザー設定を指定
   */
  withPreferences(preferences: UserPreferencesProps): this {
    return this.with('preferences', preferences)
  }

  /**
   * ユーザー設定をビルダーで指定
   */
  withPreferencesBuilder(builder: UserPreferencesBuilder): this {
    return this.with('preferences', builder.build())
  }

  /**
   * デフォルトプロフィールでビルド
   */
  withDefaults(): this {
    return this
      .withJapaneseName()
      .withTimezone('Asia/Tokyo')
      .withLanguage('ja')
      .withPreferencesBuilder(new UserPreferencesBuilder().withDefaults())
  }

  build(): UserProfileProps {
    return {
      displayName: this.props.displayName!,
      timezone: this.props.timezone!,
      language: this.props.language!,
      preferences: this.props.preferences!
    }
  }
}