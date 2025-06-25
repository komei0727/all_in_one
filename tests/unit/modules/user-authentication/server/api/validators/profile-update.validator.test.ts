import { describe, it, expect } from 'vitest'
import { updateProfileSchema } from '@/modules/user-authentication/server/api/validators/profile-update.validator'

describe('updateProfileSchema', () => {
  describe('有効なデータの検証', () => {
    it('有効なプロフィール更新データを受け入れる', () => {
      // Arrange
      const validData = {
        displayName: '山田太郎',
        timezone: 'Asia/Tokyo',
        language: 'ja',
      }

      // Act
      const result = updateProfileSchema.parse(validData)

      // Assert
      expect(result).toEqual(validData)
    })

    it('英語の言語設定を受け入れる', () => {
      // Arrange
      const validData = {
        displayName: 'John Doe',
        timezone: 'America/New_York',
        language: 'en',
      }

      // Act
      const result = updateProfileSchema.parse(validData)

      // Assert
      expect(result).toEqual(validData)
    })

    it('前後の空白をトリムする', () => {
      // Arrange
      const dataWithSpaces = {
        displayName: '  テストユーザー  ',
        timezone: '  Asia/Tokyo  ',
        language: 'ja',
      }

      // Act
      const result = updateProfileSchema.parse(dataWithSpaces)

      // Assert
      expect(result.displayName).toBe('テストユーザー')
      expect(result.timezone).toBe('Asia/Tokyo')
    })

    it('100文字の表示名を受け入れる', () => {
      // Arrange
      const longName = 'あ'.repeat(100)
      const validData = {
        displayName: longName,
        timezone: 'Asia/Tokyo',
        language: 'ja',
      }

      // Act
      const result = updateProfileSchema.parse(validData)

      // Assert
      expect(result.displayName).toHaveLength(100)
    })
  })

  describe('無効なデータの検証', () => {
    it('空の表示名を拒否する', () => {
      // Arrange
      const invalidData = {
        displayName: '',
        timezone: 'Asia/Tokyo',
        language: 'ja',
      }

      // Act & Assert
      expect(() => updateProfileSchema.parse(invalidData)).toThrow('表示名は必須です')
    })

    it('空白のみの表示名を拒否する', () => {
      // Arrange
      const invalidData = {
        displayName: '   ',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // Act
      const result = updateProfileSchema.safeParse(invalidData)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        const error = result.error.errors[0]
        expect(error.path[0]).toBe('displayName')
        expect(error.message).toBe('表示名は必須です')
      }
    })

    it('101文字以上の表示名を拒否する', () => {
      // Arrange
      const tooLongName = 'あ'.repeat(101)
      const invalidData = {
        displayName: tooLongName,
        timezone: 'Asia/Tokyo',
        language: 'ja',
      }

      // Act & Assert
      expect(() => updateProfileSchema.parse(invalidData)).toThrow(
        '表示名は100文字以内で入力してください'
      )
    })

    it('空のタイムゾーンを拒否する', () => {
      // Arrange
      const invalidData = {
        displayName: 'テストユーザー',
        timezone: '',
        language: 'ja',
      }

      // Act & Assert
      expect(() => updateProfileSchema.parse(invalidData)).toThrow('タイムゾーンは必須です')
    })

    it('サポートされていない言語を拒否する', () => {
      // Arrange
      const invalidData = {
        displayName: 'テストユーザー',
        timezone: 'Asia/Tokyo',
        language: 'fr', // フランス語はサポートされていない
      }

      // Act & Assert
      expect(() => updateProfileSchema.parse(invalidData)).toThrow('サポートされていない言語です')
    })

    it('必須フィールドが欠けている場合を拒否する', () => {
      // Arrange
      const missingDisplayName = {
        timezone: 'Asia/Tokyo',
        language: 'ja',
      }

      const missingTimezone = {
        displayName: 'テストユーザー',
        language: 'ja',
      }

      const missingLanguage = {
        displayName: 'テストユーザー',
        timezone: 'Asia/Tokyo',
      }

      // Act & Assert
      expect(() => updateProfileSchema.parse(missingDisplayName)).toThrow()
      expect(() => updateProfileSchema.parse(missingTimezone)).toThrow()
      expect(() => updateProfileSchema.parse(missingLanguage)).toThrow()
    })

    it('不正な型のデータを拒否する', () => {
      // Arrange
      const invalidTypes = {
        displayName: 123, // 数値は無効
        timezone: true, // 真偽値は無効
        language: null, // nullは無効
      }

      // Act & Assert
      expect(() => updateProfileSchema.parse(invalidTypes)).toThrow()
    })
  })

  describe('エッジケースの検証', () => {
    it('特殊文字を含む表示名を受け入れる', () => {
      // Arrange
      const validData = {
        displayName: '山田太郎@東京支社#123',
        timezone: 'Asia/Tokyo',
        language: 'ja',
      }

      // Act
      const result = updateProfileSchema.parse(validData)

      // Assert
      expect(result.displayName).toBe('山田太郎@東京支社#123')
    })

    it('絵文字を含む表示名を受け入れる', () => {
      // Arrange
      const validData = {
        displayName: '山田太郎😊',
        timezone: 'Asia/Tokyo',
        language: 'ja',
      }

      // Act
      const result = updateProfileSchema.parse(validData)

      // Assert
      expect(result.displayName).toBe('山田太郎😊')
    })

    it('様々なタイムゾーン形式を受け入れる', () => {
      // Arrange
      const timezones = [
        'UTC',
        'Europe/London',
        'America/Los_Angeles',
        'Asia/Shanghai',
        'Australia/Sydney',
      ]

      timezones.forEach((timezone) => {
        const validData = {
          displayName: 'テストユーザー',
          timezone,
          language: 'ja',
        }

        // Act
        const result = updateProfileSchema.parse(validData)

        // Assert
        expect(result.timezone).toBe(timezone)
      })
    })
  })
})
