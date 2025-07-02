import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { checkIngredientSchema } from '@/modules/ingredients/server/api/validators/check-ingredient.validator'

describe('checkIngredientSchema', () => {
  describe('正常系', () => {
    it('全フィールドが正しい場合、検証を通過する', () => {
      // Given: 正しいデータ
      const data = {
        sessionId: faker.string.uuid(),
        ingredientId: faker.string.uuid(),
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = checkIngredientSchema.safeParse(data)

      // Then: 検証を通過する
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(data)
      }
    })
  })

  describe('異常系', () => {
    it('sessionIdが空の場合、エラーになる', () => {
      // Given: sessionIdが空のデータ
      const data = {
        sessionId: '',
        ingredientId: faker.string.uuid(),
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = checkIngredientSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('セッションIDは必須です')
      }
    })

    it('sessionIdが不正なUUID形式の場合、エラーになる', () => {
      // Given: sessionIdが不正な形式のデータ
      const data = {
        sessionId: 'invalid-uuid',
        ingredientId: faker.string.uuid(),
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = checkIngredientSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          'セッションIDは有効なUUID形式である必要があります'
        )
      }
    })

    it('ingredientIdが空の場合、エラーになる', () => {
      // Given: ingredientIdが空のデータ
      const data = {
        sessionId: faker.string.uuid(),
        ingredientId: '',
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = checkIngredientSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('食材IDは必須です')
      }
    })

    it('ingredientIdが不正なUUID形式の場合、エラーになる', () => {
      // Given: ingredientIdが不正な形式のデータ
      const data = {
        sessionId: faker.string.uuid(),
        ingredientId: 'invalid-uuid',
        userId: faker.string.uuid(),
      }

      // When: バリデーションを実行
      const result = checkIngredientSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('食材IDは有効なUUID形式である必要があります')
      }
    })

    it('userIdが空の場合、エラーになる', () => {
      // Given: userIdが空のデータ
      const data = {
        sessionId: faker.string.uuid(),
        ingredientId: faker.string.uuid(),
        userId: '',
      }

      // When: バリデーションを実行
      const result = checkIngredientSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('ユーザーIDは必須です')
      }
    })

    it('必須フィールドが欠けている場合、エラーになる', () => {
      // Given: 不完全なデータ
      const data = {
        sessionId: faker.string.uuid(),
        // ingredientId と userId が欠けている
      }

      // When: バリデーションを実行
      const result = checkIngredientSchema.safeParse(data)

      // Then: エラーになる
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0)
      }
    })
  })
})
