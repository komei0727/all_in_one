import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'

import { getQuickAccessIngredientsSchema } from '@/modules/ingredients/server/api/validators/get-quick-access-ingredients.validator'

describe('getQuickAccessIngredientsSchema', () => {
  describe('正常系', () => {
    it('有効なuserIdとlimitを持つリクエストを検証できる', () => {
      // Given: 有効なリクエスト
      const request = {
        userId: faker.string.uuid(),
        limit: faker.number.int({ min: 1, max: 50 }),
      }

      // When: バリデーションを実行
      const result = getQuickAccessIngredientsSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('limitを省略した場合、デフォルト値20が設定される', () => {
      // Given: limitなしのリクエスト
      const request = {
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = getQuickAccessIngredientsSchema.parse(request)

      // Then: デフォルト値が設定される
      expect(result).toEqual({
        userId: request.userId,
        limit: 20,
      })
    })

    it('限界値1のlimitを検証できる', () => {
      // Given: limit=1のリクエスト
      const request = {
        userId: faker.string.uuid(),
        limit: 1,
      }

      // When: バリデーションを実行
      const result = getQuickAccessIngredientsSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })

    it('限界値50のlimitを検証できる', () => {
      // Given: limit=50のリクエスト
      const request = {
        userId: faker.string.uuid(),
        limit: 50,
      }

      // When: バリデーションを実行
      const result = getQuickAccessIngredientsSchema.parse(request)

      // Then: 正常に検証される
      expect(result).toEqual(request)
    })
  })

  describe('異常系 - userId', () => {
    it('userIdが存在しない場合はエラーになる', () => {
      // Given: userIdなしのリクエスト
      const request = {
        limit: 10,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow()
    })

    it('userIdが空文字の場合はエラーになる', () => {
      // Given: 空のuserId
      const request = {
        userId: '',
        limit: 10,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow('ユーザーIDは必須です')
    })

    it('userIdがnullの場合はエラーになる', () => {
      // Given: nullのuserId
      const request = {
        userId: null,
        limit: 10,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow()
    })

    it('userIdが数値の場合はエラーになる', () => {
      // Given: 数値のuserId
      const request = {
        userId: 123,
        limit: 10,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow()
    })
  })

  describe('異常系 - limit', () => {
    it('limitが0の場合はエラーになる', () => {
      // Given: limit=0のリクエスト
      const request = {
        userId: faker.string.uuid(),
        limit: 0,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow(
        '取得件数は1以上50以下である必要があります'
      )
    })

    it('limitが負の数の場合はエラーになる', () => {
      // Given: 負のlimit
      const request = {
        userId: faker.string.uuid(),
        limit: -1,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow(
        '取得件数は1以上50以下である必要があります'
      )
    })

    it('limitが50を超える場合はエラーになる', () => {
      // Given: limit=51のリクエスト
      const request = {
        userId: faker.string.uuid(),
        limit: 51,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow(
        '取得件数は1以上50以下である必要があります'
      )
    })

    it('limitが文字列の場合はエラーになる', () => {
      // Given: 文字列のlimit
      const request = {
        userId: faker.string.uuid(),
        limit: 'ten',
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow()
    })

    it('limitが小数の場合はエラーになる', () => {
      // Given: 小数のlimit
      const request = {
        userId: faker.string.uuid(),
        limit: 10.5,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow()
    })

    it('limitがbooleanの場合はエラーになる', () => {
      // Given: booleanのlimit
      const request = {
        userId: faker.string.uuid(),
        limit: true,
      }

      // When & Then: エラーがスローされる
      expect(() => getQuickAccessIngredientsSchema.parse(request)).toThrow()
    })
  })

  describe('境界値テスト', () => {
    it('limitの境界値（1, 50）を受け入れる', () => {
      // Given: 境界値のlimit
      const minRequest = {
        userId: faker.string.uuid(),
        limit: 1,
      }
      const maxRequest = {
        userId: faker.string.uuid(),
        limit: 50,
      }

      // When & Then: 両方とも正常に検証される
      expect(() => getQuickAccessIngredientsSchema.parse(minRequest)).not.toThrow()
      expect(() => getQuickAccessIngredientsSchema.parse(maxRequest)).not.toThrow()
    })

    it('limitの境界値外（0, 51）を拒否する', () => {
      // Given: 境界値外のlimit
      const belowMinRequest = {
        userId: faker.string.uuid(),
        limit: 0,
      }
      const aboveMaxRequest = {
        userId: faker.string.uuid(),
        limit: 51,
      }

      // When & Then: 両方ともエラーになる
      expect(() => getQuickAccessIngredientsSchema.parse(belowMinRequest)).toThrow()
      expect(() => getQuickAccessIngredientsSchema.parse(aboveMaxRequest)).toThrow()
    })
  })
})
