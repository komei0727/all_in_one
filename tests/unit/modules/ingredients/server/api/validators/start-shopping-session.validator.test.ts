import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'

import { startShoppingSessionSchema } from '@/modules/ingredients/server/api/validators/start-shopping-session.validator'

describe('startShoppingSessionSchema', () => {
  describe('正常系', () => {
    it('有効な全フィールドを持つリクエストを検証できる', () => {
      // Given: 全フィールドを持つ有効なリクエスト
      const request = {
        deviceType: faker.helpers.arrayElement(['MOBILE', 'TABLET', 'DESKTOP'] as const),
        location: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          name: faker.location.streetAddress(),
        },
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('空のオブジェクトでも検証できる（全フィールドがオプション）', () => {
      // Given: 空のリクエスト
      const request = {}

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('addressなしのlocationを検証できる', () => {
      // Given: addressなしのlocation
      const request = {
        location: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
        },
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('MOBILEデバイスタイプを検証できる', () => {
      // Given: MOBILEデバイスタイプ
      const request = {
        deviceType: 'MOBILE' as const,
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('TABLETデバイスタイプを検証できる', () => {
      // Given: TABLETデバイスタイプ
      const request = {
        deviceType: 'TABLET' as const,
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('DESKTOPデバイスタイプを検証できる', () => {
      // Given: DESKTOPデバイスタイプ
      const request = {
        deviceType: 'DESKTOP' as const,
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })
  })

  // userIdは認証から取得されるため、リクエストボディには含まれない

  describe('異常系 - deviceType', () => {
    it('無効なdeviceTypeの場合はエラーになる', () => {
      // Given: 無効なdeviceType
      const request = {
        deviceType: 'INVALID',
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('deviceTypeが数値の場合はエラーになる', () => {
      // Given: 数値のdeviceType
      const request = {
        deviceType: 123,
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })
  })

  describe('異常系 - location', () => {
    it('latitudeが範囲外（-90未満）の場合はエラーになる', () => {
      // Given: 無効なlatitude
      const request = {
        location: {
          latitude: -91,
          longitude: 0,
        },
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('latitudeが範囲外（90超）の場合はエラーになる', () => {
      // Given: 無効なlatitude
      const request = {
        location: {
          latitude: 91,
          longitude: 0,
        },
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('longitudeが範囲外（-180未満）の場合はエラーになる', () => {
      // Given: 無効なlongitude
      const request = {
        location: {
          latitude: 0,
          longitude: -181,
        },
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('longitudeが範囲外（180超）の場合はエラーになる', () => {
      // Given: 無効なlongitude
      const request = {
        location: {
          latitude: 0,
          longitude: 181,
        },
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('latitudeが文字列の場合はエラーになる', () => {
      // Given: 文字列のlatitude
      const request = {
        location: {
          latitude: 'invalid',
          longitude: 0,
        },
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('locationに必須フィールドが不足している場合はエラーになる', () => {
      // Given: latitudeのみのlocation
      const request = {
        location: {
          latitude: 0,
        },
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })
  })

  describe('境界値テスト', () => {
    it('latitudeの境界値（-90, 90）を受け入れる', () => {
      // Given: 境界値のlatitude
      const minRequest = {
        location: { latitude: -90, longitude: 0 },
      }
      const maxRequest = {
        location: { latitude: 90, longitude: 0 },
      }

      // When & Then: 両方とも正常に検証される
      expect(() => startShoppingSessionSchema.parse(minRequest)).not.toThrow()
      expect(() => startShoppingSessionSchema.parse(maxRequest)).not.toThrow()
    })

    it('longitudeの境界値（-180, 180）を受け入れる', () => {
      // Given: 境界値のlongitude
      const minRequest = {
        location: { latitude: 0, longitude: -180 },
      }
      const maxRequest = {
        location: { latitude: 0, longitude: 180 },
      }

      // When & Then: 両方とも正常に検証される
      expect(() => startShoppingSessionSchema.parse(minRequest)).not.toThrow()
      expect(() => startShoppingSessionSchema.parse(maxRequest)).not.toThrow()
    })
  })
})
