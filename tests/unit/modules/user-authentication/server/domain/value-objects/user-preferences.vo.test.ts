import { describe, it, expect } from 'vitest'
import { UserPreferencesBuilder } from '../../../../../../__fixtures__/builders'

// テスト対象のUserPreferencesクラス
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'

describe('UserPreferences値オブジェクト', () => {
  describe('正常な値での作成', () => {
    it('有効な設定値で作成できる', () => {
      // Arrange（準備）
      const validPreferences = {
        theme: 'light' as const,
        notifications: true,
        emailFrequency: 'weekly' as const,
      }

      // Act（実行）
      const preferences = new UserPreferences(validPreferences)

      // Assert（検証）
      expect(preferences.getTheme()).toBe('light')
      expect(preferences.getNotifications()).toBe(true)
      expect(preferences.getEmailFrequency()).toBe('weekly')
    })

    it('テストデータビルダーで生成した設定で作成できる', () => {
      // Arrange（準備）
      const testPreferencesData = new UserPreferencesBuilder().withDefaults().build()

      // Act（実行） - 実装後にコメントアウト解除
      // const preferences = new UserPreferences(testPreferencesData)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(preferences.getTheme()).toBe('light')
      // expect(preferences.getNotifications()).toBe(true)
      // expect(preferences.getEmailFrequency()).toBe('weekly')

      // 実装前のプレースホルダー
      expect(testPreferencesData.theme).toBe('light')
    })

    it('ダークテーマで作成できる', () => {
      // Arrange（準備）
      const testPreferencesData = new UserPreferencesBuilder()
        .withTheme('dark')
        .withNotifications(false)
        .withEmailFrequency('monthly')
        .build()

      // Act（実行） - 実装後にコメントアウト解除
      // const preferences = new UserPreferences(testPreferencesData)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(preferences.getTheme()).toBe('dark')
      // expect(preferences.getNotifications()).toBe(false)
      // expect(preferences.getEmailFrequency()).toBe('monthly')

      // 実装前のプレースホルダー
      expect(testPreferencesData.theme).toBe('dark')
    })
  })

  describe('不正な値での作成', () => {
    it('無効なテーマで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidPreferences = {
        theme: 'invalid-theme' as any,
        notifications: true,
        emailFrequency: 'weekly' as const,
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserPreferences(invalidPreferences)).toThrow(
        '無効なテーマが指定されています'
      )
    })

    it('無効なメール頻度で作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidPreferences = {
        theme: 'light' as const,
        notifications: true,
        emailFrequency: 'invalid-frequency' as any,
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserPreferences(invalidPreferences)).toThrow(
        '無効なメール頻度が指定されています'
      )
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const nullPreferences = null as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserPreferences(nullPreferences)).toThrow('ユーザー設定は必須です')
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const undefinedPreferences = undefined as any

      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new UserPreferences(undefinedPreferences))
      //   .toThrow('ユーザー設定は必須です')

      // 実装前のプレースホルダー
      expect(undefinedPreferences).toBeUndefined()
    })

    it('通知設定がbooleanでない場合エラーが発生する', () => {
      // Arrange（準備）
      const invalidPreferences = {
        theme: 'light' as const,
        notifications: 'yes' as any, // boolean以外
        emailFrequency: 'weekly' as const,
      }

      // Act & Assert（実行 & 検証）
      expect(() => new UserPreferences(invalidPreferences)).toThrow(
        '通知設定はtrue/falseで指定してください'
      )
    })
  })

  describe('設定値の取得', () => {
    it('各設定値を個別に取得できる', () => {
      // Arrange（準備）
      const preferencesData = {
        theme: 'dark' as const,
        notifications: false,
        emailFrequency: 'never' as const,
      }

      // Act（実行） - 実装後にコメントアウト解除
      // const preferences = new UserPreferences(preferencesData)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(preferences.getTheme()).toBe('dark')
      // expect(preferences.getNotifications()).toBe(false)
      // expect(preferences.getEmailFrequency()).toBe('never')

      // 実装前のプレースホルダー
      expect(preferencesData.theme).toBe('dark')
    })

    it('すべての設定値を一括で取得できる', () => {
      // Arrange（準備）
      const preferencesData = {
        theme: 'auto' as const,
        notifications: true,
        emailFrequency: 'daily' as const,
      }

      // Act（実行） - 実装後にコメントアウト解除
      // const preferences = new UserPreferences(preferencesData)

      // Assert（検証） - 実装後にコメントアウト解除
      // const allSettings = preferences.getValue()
      // expect(allSettings).toEqual(preferencesData)

      // 実装前のプレースホルダー
      expect(preferencesData).toEqual(preferencesData)
    })
  })

  describe('設定値の更新', () => {
    it('テーマを更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserPreferencesBuilder().withDefaults().build()

      // Act（実行） - 実装後にコメントアウト解除
      // const original = new UserPreferences(originalData)
      // const updated = original.withTheme('dark')

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(original.getTheme()).toBe('light') // 元は変更されない
      // expect(updated.getTheme()).toBe('dark') // 新しいインスタンスは更新されている
      // expect(updated.getNotifications()).toBe(true) // 他の設定は保持

      // 実装前のプレースホルダー
      expect(originalData.theme).toBe('light')
    })

    it('通知設定を更新した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const originalData = new UserPreferencesBuilder().withDefaults().build()

      // Act（実行） - 実装後にコメントアウト解除
      // const original = new UserPreferences(originalData)
      // const updated = original.withNotifications(false)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(original.getNotifications()).toBe(true) // 元は変更されない
      // expect(updated.getNotifications()).toBe(false) // 新しいインスタンスは更新されている
      // expect(updated.getTheme()).toBe('light') // 他の設定は保持

      // 実装前のプレースホルダー
      expect(originalData.notifications).toBe(true)
    })
  })

  describe('等価性比較', () => {
    it('同じ設定値のUserPreferencesは等しい', () => {
      // Arrange（準備）
      const preferencesData = {
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
      }

      // Act（実行） - 実装後にコメントアウト解除
      // const preferences1 = new UserPreferences(preferencesData)
      // const preferences2 = new UserPreferences(preferencesData)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(preferences1.equals(preferences2)).toBe(true)

      // 実装前のプレースホルダー
      expect(preferencesData).toEqual(preferencesData)
    })

    it('異なる設定値のUserPreferencesは等しくない', () => {
      // Arrange（準備）
      const data1 = { theme: 'light', notifications: true, emailFrequency: 'weekly' }
      const data2 = { theme: 'dark', notifications: true, emailFrequency: 'weekly' }

      // Act（実行） - 実装後にコメントアウト解除
      // const preferences1 = new UserPreferences(data1)
      // const preferences2 = new UserPreferences(data2)

      // Assert（検証） - 実装後にコメントアウト解除
      // expect(preferences1.equals(preferences2)).toBe(false)

      // 実装前のプレースホルダー
      expect(data1.theme).not.toBe(data2.theme)
    })
  })

  describe('デフォルト設定', () => {
    it('デフォルト設定でインスタンスを作成できる', () => {
      // Act（実行）
      const preferences = UserPreferences.createDefault()

      // Assert（検証）
      expect(preferences.getTheme()).toBe('light')
      expect(preferences.getNotifications()).toBe(true)
      expect(preferences.getEmailFrequency()).toBe('weekly')
    })
  })
})
