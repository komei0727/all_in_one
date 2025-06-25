import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { UserPreferences } from './user-preferences.vo'

/**
 * ユーザープロフィールプロパティ
 */
export interface UserProfileProps {
  displayName: string
  timezone: string
  language: 'ja' | 'en'
  preferences: UserPreferences
}

/**
 * ユーザープロフィール値オブジェクト
 * ユーザーの基本情報と設定を表現する複合値オブジェクト
 */
export class UserProfile extends ValueObject<UserProfileProps> {
  private static readonly MAX_DISPLAY_NAME_LENGTH = 100
  private static readonly VALID_LANGUAGES = ['ja', 'en'] as const
  private static readonly VALID_TIMEZONES = [
    'Asia/Tokyo',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Australia/Sydney',
    'UTC',
  ]

  constructor(value: UserProfileProps) {
    super(value)
  }

  protected validate(value: UserProfileProps): void {
    // 必須チェック
    if (value === null || value === undefined) {
      throw new Error('ユーザープロフィールは必須です')
    }

    // 表示名のバリデーション
    if (!value.displayName || value.displayName.trim() === '') {
      throw new Error('表示名は必須です')
    }

    if (value.displayName.length > UserProfile.MAX_DISPLAY_NAME_LENGTH) {
      throw new Error('表示名は100文字以内で入力してください')
    }

    // 言語のバリデーション
    if (!UserProfile.VALID_LANGUAGES.includes(value.language)) {
      throw new Error('サポートされていない言語です')
    }

    // タイムゾーンのバリデーション
    if (!UserProfile.VALID_TIMEZONES.includes(value.timezone)) {
      throw new Error('無効なタイムゾーンです')
    }

    // 設定のバリデーション（UserPreferencesが独自にバリデーション済み）
    if (!(value.preferences instanceof UserPreferences)) {
      throw new Error('無効なユーザー設定です')
    }
  }

  /**
   * 表示名を取得
   */
  getDisplayName(): string {
    return this.value.displayName
  }

  /**
   * タイムゾーンを取得
   */
  getTimezone(): string {
    return this.value.timezone
  }

  /**
   * 言語を取得
   */
  getLanguage(): 'ja' | 'en' {
    return this.value.language
  }

  /**
   * ユーザー設定を取得
   */
  getPreferences(): UserPreferences {
    return this.value.preferences
  }

  /**
   * 表示名を変更した新しいインスタンスを作成
   */
  withDisplayName(displayName: string): UserProfile {
    return new UserProfile({
      ...this.value,
      displayName,
    })
  }

  /**
   * タイムゾーンを変更した新しいインスタンスを作成
   */
  withTimezone(timezone: string): UserProfile {
    return new UserProfile({
      ...this.value,
      timezone,
    })
  }

  /**
   * 言語を変更した新しいインスタンスを作成
   */
  withLanguage(language: 'ja' | 'en'): UserProfile {
    return new UserProfile({
      ...this.value,
      language,
    })
  }

  /**
   * ユーザー設定を変更した新しいインスタンスを作成
   */
  withPreferences(preferences: UserPreferences): UserProfile {
    return new UserProfile({
      ...this.value,
      preferences,
    })
  }

  /**
   * 等価性を比較
   */
  equals(other: UserProfile): boolean {
    if (!(other instanceof UserProfile)) {
      return false
    }
    return (
      this.value.displayName === other.value.displayName &&
      this.value.timezone === other.value.timezone &&
      this.value.language === other.value.language &&
      this.value.preferences.equals(other.value.preferences)
    )
  }

  /**
   * デフォルトプロフィールでインスタンスを作成
   */
  static createDefault(displayName: string): UserProfile {
    return new UserProfile({
      displayName,
      timezone: 'Asia/Tokyo',
      language: 'ja',
      preferences: UserPreferences.createDefault(),
    })
  }
}
