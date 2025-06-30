import { describe, it, expect } from 'vitest'

import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserProfileBuilder, UserPreferencesBuilder } from '@tests/__fixtures__/builders'

// テスト対象のUserProfileクラス

// テスト用ヘルパー関数
const createUserProfileFromData = (data: any) => {
  if (data.preferences && !(data.preferences instanceof UserPreferences)) {
    return new UserProfile({
      ...data,
      preferences: new UserPreferences(data.preferences),
    })
  }
  return new UserProfile(data)
}

describe('UserProfile値オブジェクト', () => {
  describe('正常な値での作成', () => {
    it('有効なプロフィール情報で作成できる', () => {
      // Arrange（準備）
      const validProfile = {
        displayName: '田中 健太',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
        preferences: new UserPreferences({
          theme: 'light' as const,
          notifications: true,
          emailFrequency: 'weekly' as const,
        }),
      }

      // Act（実行）
      const profile = new UserProfile(validProfile)

      // Assert（検証）
      expect(profile.getDisplayName()).toBe('田中 健太')
      expect(profile.getTimezone()).toBe('Asia/Tokyo')
      expect(profile.getLanguage()).toBe('ja')
      expect(profile.getPreferences().getTheme()).toBe('light')
    })

    it('テストデータビルダーで生成したプロフィールで作成できる', () => {
      // Arrange（準備）
      const testProfileData = new UserProfileBuilder().withDefaults().build()

      // Act（実行）
      const profile = createUserProfileFromData(testProfileData)

      // Assert（検証）
      expect(profile.getDisplayName()).toBeDefined()
      expect(profile.getTimezone()).toBe('Asia/Tokyo')
      expect(profile.getLanguage()).toBe('ja')
    })

    it('英語環境のプロフィールで作成できる', () => {
      // Arrange（準備）
      const englishProfile = new UserProfileBuilder()
        .withDisplayName('John Smith')
        .withTimezone('America/New_York')
        .withLanguage('en')
        .withPreferencesBuilder(
          new UserPreferencesBuilder().withTheme('dark').withEmailFrequency('daily')
        )
        .build()

      // Act（実行）
      const profile = createUserProfileFromData(englishProfile)

      // Assert（検証）
      expect(profile.getDisplayName()).toBe('John Smith')
      expect(profile.getTimezone()).toBe('America/New_York')
      expect(profile.getLanguage()).toBe('en')
    })
  })

  describe('不正な値での作成', () => {
    it('表示名が空文字で作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidProfile = {
        displayName: '',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
        preferences: UserPreferences.createDefault(),
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(invalidProfile)).toThrow('displayNameは必須です')
    })

    it('表示名が空白文字のみの場合エラーが発生する', () => {
      // Arrange（準備）
      const invalidProfile = {
        displayName: '   ',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
        preferences: UserPreferences.createDefault(),
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(invalidProfile)).toThrow('displayNameは必須です')
    })

    it('表示名が長すぎる場合エラーが発生する', () => {
      // Arrange（準備）
      const invalidProfile = {
        displayName: 'a'.repeat(101), // 100文字を超える
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
        preferences: UserPreferences.createDefault(),
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(invalidProfile)).toThrow('表示名は100文字以内で入力してください')
    })

    it('無効な言語で作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidProfile = {
        displayName: '田中 健太',
        timezone: 'Asia/Tokyo',
        language: 'invalid' as any,
        preferences: UserPreferences.createDefault(),
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(invalidProfile)).toThrow('サポートされていない言語です')
    })

    it('無効なタイムゾーンで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidProfile = {
        displayName: '田中 健太',
        timezone: 'Invalid/Timezone',
        language: 'ja' as const,
        preferences: UserPreferences.createDefault(),
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(invalidProfile)).toThrow('無効なタイムゾーンです')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const nullProfile = null as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(nullProfile)).toThrow('userProfileは必須です')
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const undefinedProfile = undefined as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(undefinedProfile)).toThrow('userProfileは必須です')
    })

    it('無効なUserPreferencesで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidProfile = {
        displayName: '田中 健太',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
        preferences: { theme: 'light' } as any, // UserPreferencesインスタンスではない
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserProfile(invalidProfile)).toThrow('無効なユーザー設定です')
    })
  })

  describe('プロフィール情報の取得', () => {
    it('各プロフィール情報を個別に取得できる', () => {
      // Arrange（準備）
      const profileData = new UserProfileBuilder().withDefaults().build()

      // Act（実行）
      const profile = createUserProfileFromData(profileData)

      // Assert（検証）
      expect(profile.getDisplayName()).toBeDefined()
      expect(profile.getTimezone()).toBe('Asia/Tokyo')
      expect(profile.getLanguage()).toBe('ja')
      expect(profile.getPreferences()).toBeInstanceOf(UserPreferences)
    })

    it('設定情報を通じて詳細な設定を取得できる', () => {
      // Arrange（準備）
      const profileData = new UserProfileBuilder().withDefaults().build()

      // Act（実行）
      const profile = createUserProfileFromData(profileData)
      const preferences = profile.getPreferences()

      // Assert（検証）
      expect(preferences.getTheme()).toBe('light')
      expect(preferences.getNotifications()).toBe(true)
      expect(preferences.getEmailFrequency()).toBe('weekly')
    })
  })

  describe('プロフィール情報の更新', () => {
    it('表示名を更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserProfileBuilder().withDefaults().build()

      // Act（実行）
      const original = createUserProfileFromData(originalData)
      const updated = original.withDisplayName('新しい名前')

      // Assert（検証）
      expect(original.getDisplayName()).not.toBe('新しい名前') // 元は変更されない
      expect(updated.getDisplayName()).toBe('新しい名前') // 新しいインスタンスは更新されている
      expect(updated.getTimezone()).toBe(original.getTimezone()) // 他の設定は保持
    })

    it('タイムゾーンを更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserProfileBuilder().withDefaults().build()

      // Act（実行）
      const original = createUserProfileFromData(originalData)
      const updated = original.withTimezone('America/New_York')

      // Assert（検証）
      expect(original.getTimezone()).toBe('Asia/Tokyo') // 元は変更されない
      expect(updated.getTimezone()).toBe('America/New_York') // 新しいインスタンスは更新されている
      expect(updated.getDisplayName()).toBe(original.getDisplayName()) // 他の設定は保持
    })

    it('言語を更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserProfileBuilder().withDefaults().build()

      // Act（実行）
      const original = createUserProfileFromData(originalData)
      const updated = original.withLanguage('en')

      // Assert（検証）
      expect(original.getLanguage()).toBe('ja') // 元は変更されない
      expect(updated.getLanguage()).toBe('en') // 新しいインスタンスは更新されている
      expect(updated.getDisplayName()).toBe(original.getDisplayName()) // 他の設定は保持
    })

    it('設定を更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserProfileBuilder().withDefaults().build()
      const newPreferencesData = new UserPreferencesBuilder()
        .withTheme('dark')
        .withNotifications(false)
        .build()
      const newPreferences = new UserPreferences(newPreferencesData)

      // Act（実行）
      const original = createUserProfileFromData(originalData)
      const updated = original.withPreferences(newPreferences)

      // Assert（検証）
      expect(original.getPreferences().getTheme()).toBe('light') // 元は変更されない
      expect(updated.getPreferences().getTheme()).toBe('dark') // 新しいインスタンスは更新されている
      expect(updated.getDisplayName()).toBe(original.getDisplayName()) // 他の設定は保持
    })

    it('すべてのタイムゾーンオプションが使用できる', () => {
      // Arrange（準備）
      const validTimezones = [
        'Asia/Tokyo',
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Australia/Sydney',
        'UTC',
      ]
      const profile = UserProfile.createDefault('テストユーザー')

      // Act & Assert（実行 & 検証）
      validTimezones.forEach((timezone) => {
        const updated = profile.withTimezone(timezone)
        expect(updated.getTimezone()).toBe(timezone)
      })
    })
  })

  describe('等価性比較', () => {
    it('同じプロフィール情報のUserProfileは等しい', () => {
      // Arrange（準備）
      const profileData = new UserProfileBuilder().withDefaults().build()

      // Act（実行）
      const profile1 = createUserProfileFromData(profileData)
      const profile2 = createUserProfileFromData(profileData)

      // Assert（検証）
      expect(profile1.equals(profile2)).toBe(true)
    })

    it('異なるプロフィール情報のUserProfileは等しくない', () => {
      // Arrange（準備）
      const profile1Data = new UserProfileBuilder().withDisplayName('田中').build()
      const profile2Data = new UserProfileBuilder().withDisplayName('佐藤').build()

      // Act（実行）
      const profile1 = createUserProfileFromData(profile1Data)
      const profile2 = createUserProfileFromData(profile2Data)

      // Assert（検証）
      expect(profile1.equals(profile2)).toBe(false)
    })

    it('UserProfile以外のオブジェクトとは等しくない', () => {
      // Arrange（準備）
      const profile = UserProfile.createDefault('テストユーザー')
      const notProfile = { displayName: 'テストユーザー' }

      // Act & Assert（実行 & 検証）
      expect(profile.equals(notProfile as any)).toBe(false)
    })

    it('異なるタイムゾーンのUserProfileは等しくない', () => {
      // Arrange（準備）
      const profile1Data = new UserProfileBuilder().withTimezone('Asia/Tokyo').build()
      const profile2Data = new UserProfileBuilder().withTimezone('America/New_York').build()

      // Act（実行）
      const profile1 = createUserProfileFromData(profile1Data)
      const profile2 = createUserProfileFromData(profile2Data)

      // Assert（検証）
      expect(profile1.equals(profile2)).toBe(false)
    })

    it('異なる言語のUserProfileは等しくない', () => {
      // Arrange（準備）
      const profile1Data = new UserProfileBuilder().withLanguage('ja').build()
      const profile2Data = new UserProfileBuilder().withLanguage('en').build()

      // Act（実行）
      const profile1 = createUserProfileFromData(profile1Data)
      const profile2 = createUserProfileFromData(profile2Data)

      // Assert（検証）
      expect(profile1.equals(profile2)).toBe(false)
    })

    it('異なる設定のUserProfileは等しくない', () => {
      // Arrange（準備）
      const _preferences1 = UserPreferences.createDefault()
      const _preferences2 = new UserPreferences({
        theme: 'dark' as const,
        notifications: true,
        emailFrequency: 'weekly' as const,
      })

      const profile1Data = new UserProfileBuilder()
        .withPreferencesBuilder(
          new UserPreferencesBuilder()
            .withTheme('light')
            .withNotifications(true)
            .withEmailFrequency('weekly')
        )
        .build()
      const profile2Data = new UserProfileBuilder()
        .withPreferencesBuilder(
          new UserPreferencesBuilder()
            .withTheme('dark')
            .withNotifications(true)
            .withEmailFrequency('weekly')
        )
        .build()

      // Act（実行）
      const profile1 = createUserProfileFromData(profile1Data)
      const profile2 = createUserProfileFromData(profile2Data)

      // Assert（検証）
      expect(profile1.equals(profile2)).toBe(false)
    })
  })

  describe('デフォルトプロフィール', () => {
    it('デフォルトプロフィールでインスタンスを作成できる', () => {
      // Act（実行）
      const profile = UserProfile.createDefault('デフォルトユーザー')

      // Assert（検証）
      expect(profile.getDisplayName()).toBe('デフォルトユーザー')
      expect(profile.getTimezone()).toBe('Asia/Tokyo')
      expect(profile.getLanguage()).toBe('ja')
      expect(profile.getPreferences().getTheme()).toBe('light')
    })
  })
})
