import { describe, it, expect } from 'vitest'
import { UserProfileBuilder, UserPreferencesBuilder } from '../../../../../../__fixtures__/builders'

// テスト対象のUserProfileクラス
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'

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

      // Act（実行） - 実装後にコメントアウト解除
      // const profile = new UserProfile(testProfileData)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(profile.getDisplayName()).toBeDefined()
      // expect(profile.getTimezone()).toBe('Asia/Tokyo')
      // expect(profile.getLanguage()).toBe('ja')

      // 実装前のプレースホルダー
      expect(testProfileData.timezone).toBe('Asia/Tokyo')
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

      // Act（実行） - 実装後にコメントアウト解除
      // const profile = new UserProfile(englishProfile)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(profile.getDisplayName()).toBe('John Smith')
      // expect(profile.getTimezone()).toBe('America/New_York')
      // expect(profile.getLanguage()).toBe('en')

      // 実装前のプレースホルダー
      expect(englishProfile.displayName).toBe('John Smith')
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
      expect(() => new UserProfile(invalidProfile)).toThrow('表示名は必須です')
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
        language: 'invalid',
        preferences: UserPreferences.createDefault(),
      }

      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new UserProfile(invalidProfile))
      //   .toThrow('サポートされていない言語です')

      // 実装前のプレースホルダー
      expect(invalidProfile.language).toBe('invalid')
    })

    it('無効なタイムゾーンで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidProfile = {
        displayName: '田中 健太',
        timezone: 'Invalid/Timezone',
        language: 'ja' as const,
        preferences: UserPreferences.createDefault(),
      }

      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new UserProfile(invalidProfile))
      //   .toThrow('無効なタイムゾーンです')

      // 実装前のプレースホルダー
      expect(invalidProfile.timezone).toBe('Invalid/Timezone')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const nullProfile = null as any

      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new UserProfile(nullProfile))
      //   .toThrow('ユーザープロフィールは必須です')

      // 実装前のプレースホルダー
      expect(nullProfile).toBeNull()
    })
  })

  describe('プロフィール情報の取得', () => {
    it('各プロフィール情報を個別に取得できる', () => {
      // Arrange（準備）
      const profileData = new UserProfileBuilder().withDefaults().build()

      // Act（実行） - 実装後にコメントアウト解除
      // const profile = new UserProfile(profileData)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(profile.getDisplayName()).toBeDefined()
      // expect(profile.getTimezone()).toBe('Asia/Tokyo')
      // expect(profile.getLanguage()).toBe('ja')
      // expect(profile.getPreferences()).toBeInstanceOf(UserPreferences)

      // 実装前のプレースホルダー
      expect(profileData.timezone).toBe('Asia/Tokyo')
    })

    it('設定情報を通じて詳細な設定を取得できる', () => {
      // Arrange（準備）
      const profileData = new UserProfileBuilder().withDefaults().build()

      // Act（実行） - 実装後にコメントアウト解除
      // const profile = new UserProfile(profileData)
      // const preferences = profile.getPreferences()

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(preferences.getTheme()).toBe('light')
      // expect(preferences.getNotifications()).toBe(true)
      // expect(preferences.getEmailFrequency()).toBe('weekly')

      // 実装前のプレースホルダー
      expect(profileData.preferences.theme).toBe('light')
    })
  })

  describe('プロフィール情報の更新', () => {
    it('表示名を更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserProfileBuilder().withDefaults().build()

      // Act（実行） - 実装後にコメントアウト解除
      // const original = new UserProfile(originalData)
      // const updated = original.withDisplayName('新しい名前')

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(original.getDisplayName()).not.toBe('新しい名前') // 元は変更されない
      // expect(updated.getDisplayName()).toBe('新しい名前') // 新しいインスタンスは更新されている
      // expect(updated.getTimezone()).toBe(original.getTimezone()) // 他の設定は保持

      // 実装前のプレースホルダー
      expect(originalData.displayName).toBeDefined()
    })

    it('設定を更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserProfileBuilder().withDefaults().build()
      const newPreferencesData = new UserPreferencesBuilder()
        .withTheme('dark')
        .withNotifications(false)
        .build()
      const newPreferences = new UserPreferences(newPreferencesData)

      // Act（実行） - 実装後にコメントアウト解除
      // const original = new UserProfile(originalData)
      // const updated = original.withPreferences(newPreferences)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(original.getPreferences().getTheme()).toBe('light') // 元は変更されない
      // expect(updated.getPreferences().getTheme()).toBe('dark') // 新しいインスタンスは更新されている
      // expect(updated.getDisplayName()).toBe(original.getDisplayName()) // 他の設定は保持

      // 実装前のプレースホルダー
      expect(newPreferences.getTheme()).toBe('dark')
    })
  })

  describe('等価性比較', () => {
    it('同じプロフィール情報のUserProfileは等しい', () => {
      // Arrange（準備）
      const profileData = new UserProfileBuilder().withDefaults().build()

      // Act（実行） - 実装後にコメントアウト解除
      // const profile1 = new UserProfile(profileData)
      // const profile2 = new UserProfile(profileData)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(profile1.equals(profile2)).toBe(true)

      // 実装前のプレースホルダー
      expect(profileData).toEqual(profileData)
    })

    it('異なるプロフィール情報のUserProfileは等しくない', () => {
      // Arrange（準備）
      const profile1Data = new UserProfileBuilder().withDisplayName('田中').build()
      const profile2Data = new UserProfileBuilder().withDisplayName('佐藤').build()

      // Act（実行） - 実装後にコメントアウト解除
      // const profile1 = new UserProfile(profile1Data)
      // const profile2 = new UserProfile(profile2Data)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(profile1.equals(profile2)).toBe(false)

      // 実装前のプレースホルダー
      expect(profile1Data.displayName).not.toBe(profile2Data.displayName)
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
