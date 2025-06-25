import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

/**
 * ユーザー設定プロパティ
 */
export interface UserPreferencesProps {
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
  emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never'
}

/**
 * ユーザー設定値オブジェクト
 * ユーザーの個人設定を表現する
 */
export class UserPreferences extends ValueObject<UserPreferencesProps> {
  private static readonly VALID_THEMES = ['light', 'dark', 'auto'] as const
  private static readonly VALID_EMAIL_FREQUENCIES = ['daily', 'weekly', 'monthly', 'never'] as const

  constructor(value: UserPreferencesProps) {
    super(value)
  }

  protected validate(value: UserPreferencesProps): void {
    // 必須チェック
    if (value === null || value === undefined) {
      throw new Error('ユーザー設定は必須です')
    }

    // テーマのバリデーション
    if (!UserPreferences.VALID_THEMES.includes(value.theme)) {
      throw new Error('無効なテーマが指定されています')
    }

    // 通知設定のバリデーション
    if (typeof value.notifications !== 'boolean') {
      throw new Error('通知設定はtrue/falseで指定してください')
    }

    // メール頻度のバリデーション
    if (!UserPreferences.VALID_EMAIL_FREQUENCIES.includes(value.emailFrequency)) {
      throw new Error('無効なメール頻度が指定されています')
    }
  }

  /**
   * テーマ設定を取得
   */
  getTheme(): 'light' | 'dark' | 'auto' {
    return this.value.theme
  }

  /**
   * 通知設定を取得
   */
  getNotifications(): boolean {
    return this.value.notifications
  }

  /**
   * メール頻度設定を取得
   */
  getEmailFrequency(): 'daily' | 'weekly' | 'monthly' | 'never' {
    return this.value.emailFrequency
  }

  /**
   * テーマを変更した新しいインスタンスを作成
   */
  withTheme(theme: 'light' | 'dark' | 'auto'): UserPreferences {
    return new UserPreferences({
      ...this.value,
      theme,
    })
  }

  /**
   * 通知設定を変更した新しいインスタンスを作成
   */
  withNotifications(notifications: boolean): UserPreferences {
    return new UserPreferences({
      ...this.value,
      notifications,
    })
  }

  /**
   * メール頻度を変更した新しいインスタンスを作成
   */
  withEmailFrequency(emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never'): UserPreferences {
    return new UserPreferences({
      ...this.value,
      emailFrequency,
    })
  }

  /**
   * 等価性を比較
   */
  equals(other: UserPreferences): boolean {
    if (!(other instanceof UserPreferences)) {
      return false
    }
    return (
      this.value.theme === other.value.theme &&
      this.value.notifications === other.value.notifications &&
      this.value.emailFrequency === other.value.emailFrequency
    )
  }

  /**
   * デフォルト設定でインスタンスを作成
   */
  static createDefault(): UserPreferences {
    return new UserPreferences({
      theme: 'light',
      notifications: true,
      emailFrequency: 'weekly',
    })
  }
}
