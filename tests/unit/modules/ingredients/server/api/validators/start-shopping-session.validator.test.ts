import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'

import { startShoppingSessionSchema } from '@/modules/ingredients/server/api/validators/start-shopping-session.validator'

describe('startShoppingSessionSchema', () => {
  describe('正常系', () => {
    it('有効な全フィールドを持つリクエストを検証できる', () => {
      // Given: 全フィールドを持つ有効なリクエスト
      const request = {
        userId: faker.string.uuid(),
        deviceType: faker.helpers.arrayElement(['MOBILE', 'TABLET', 'DESKTOP']),
        location: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          address: faker.location.streetAddress(),
        },
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('userIdのみの最小限のリクエストを検証できる', () => {
      // Given: userIdのみのリクエスト
      const request = {
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('addressなしのlocationを検証できる', () => {
      // Given: addressなしのlocation
      const request = {
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
        deviceType: 'MOBILE',
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('TABLETデバイスタイプを検証できる', () => {
      // Given: TABLETデバイスタイプ
      const request = {
        userId: faker.string.uuid(),
        deviceType: 'TABLET',
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('DESKTOPデバイスタイプを検証できる', () => {
      // Given: DESKTOPデバイスタイプ
      const request = {
        userId: faker.string.uuid(),
        deviceType: 'DESKTOP',
      }

      // When: バリデーションを実行
      const result = startShoppingSessionSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })
  })

  describe('異常系 - userId', () => {
    it('userIdが存在しない場合はエラーになる', () => {
      // Given: userIdなしのリクエスト
      const request = {}

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('userIdが空文字の場合はエラーになる', () => {
      // Given: 空のuserId
      const request = { userId: '' }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow('ユーザーIDは必須です')
    })

    it('userIdがnullの場合はエラーになる', () => {
      // Given: nullのuserId
      const request = { userId: null }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })
  })

  describe('異常系 - deviceType', () => {
    it('無効なdeviceTypeの場合はエラーになる', () => {
      // Given: 無効なdeviceType
      const request = {
        userId: faker.string.uuid(),
        deviceType: 'INVALID',
      }

      // When & Then: エラーがスローされる
      expect(() => startShoppingSessionSchema.parse(request)).toThrow()
    })

    it('deviceTypeが数値の場合はエラーになる', () => {
      // Given: 数値のdeviceType
      const request = {
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
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
        userId: faker.string.uuid(),
        location: { latitude: -90, longitude: 0 },
      }
      const maxRequest = {
        userId: faker.string.uuid(),
        location: { latitude: 90, longitude: 0 },
      }

      // When & Then: 両方とも正常に検証される
      expect(() => startShoppingSessionSchema.parse(minRequest)).not.toThrow()
      expect(() => startShoppingSessionSchema.parse(maxRequest)).not.toThrow()
    })

    it('longitudeの境界値（-180, 180）を受け入れる', () => {
      // Given: 境界値のlongitude
      const minRequest = {
        userId: faker.string.uuid(),
        location: { latitude: 0, longitude: -180 },
      }
      const maxRequest = {
        userId: faker.string.uuid(),
        location: { latitude: 0, longitude: 180 },
      }

      // When & Then: 両方とも正常に検証される
      expect(() => startShoppingSessionSchema.parse(minRequest)).not.toThrow()
      expect(() => startShoppingSessionSchema.parse(maxRequest)).not.toThrow()
    })
  })
})
