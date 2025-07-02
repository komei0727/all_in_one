import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { getIngredientCheckStatisticsSchema } from '@/modules/ingredients/server/api/validators/get-ingredient-check-statistics.validator'

describe('getIngredientCheckStatisticsSchema', () => {
  describe('正常系', () => {
    it('必須フィールドのみで検証を通過する', () => {
      // Given: 必須フィールドのみのデータ
      const data = {
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = getIngredientCheckStatisticsSchema.safeParse(data)

      // Then: 検証を通過する
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          userId: data.userId,
          ingredientId: undefined,
        })
      }
    })

    it('ingredientIdが指定された場合も検証を通過する', () => {
      // Given: 全フィールドを含むデータ
      const data = {
        userId: faker.string.uuid(),
        ingredientId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = getIngredientCheckStatisticsSchema.safeParse(data)

      // Then: 検証を通過する
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(data)
      }
    })
  })

  describe('異常系', () => {
    it('userIdが空の場合、エラーになる', () => {
      // Given: userIdが空のデータ
      const data = {
        userId: '',
        ingredientId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = getIngredientCheckStatisticsSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('ユーザーIDは必須です')
      }
    })

    it('ingredientIdが空文字の場合、undefinedに変換される', () => {
      // Given: ingredientIdが空文字のデータ
      const data = {
        userId: faker.string.uuid(),
        ingredientId: '',
      }

      // When: バリデーションを実行
      const result = getIngredientCheckStatisticsSchema.safeParse(data)

      // Then: 検証を通過し、ingredientIdがundefinedになる
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ingredientId).toBeUndefined()
      }
    })

    it('ingredientIdが不正なUUID形式の場合、エラーになる', () => {
      // Given: ingredientIdが不正な形式のデータ
      const data = {
        userId: faker.string.uuid(),
        ingredientId: 'invalid-uuid-format',
      }

      // When: バリデーションを実行
      const result = getIngredientCheckStatisticsSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('must be a valid UUID')
      }
    })

    it('ingredientIdがundefinedの場合は正常に処理される', () => {
      // Given: ingredientIdがundefinedのデータ
      const data = {
        userId: faker.string.uuid(),
        ingredientId: undefined,
      }

      // When: バリデーションを実行
      const result = getIngredientCheckStatisticsSchema.safeParse(data)

      // Then: 検証を通過する
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ingredientId).toBeUndefined()
      }
    })
  })
})
