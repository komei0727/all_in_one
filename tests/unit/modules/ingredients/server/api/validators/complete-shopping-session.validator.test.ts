import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'

import { completeShoppingSessionValidator } from '@/modules/ingredients/server/api/validators/complete-shopping-session.validator'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects/shopping-session-id.vo'

describe('completeShoppingSessionValidator', () => {
  describe('正常系', () => {
    it('有効なsessionIdを受け入れる', () => {
      // Given: 有効なセッションID
      const validSessionId = ShoppingSessionId.create().getValue()
      const input = {
        sessionId: validSessionId,
      }

      // When: バリデーションを実行
      const result = completeShoppingSessionValidator.safeParse(input)

      // Then: バリデーションが成功する
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sessionId).toBe(validSessionId)
      }
    })
  })

  describe('異常系', () => {
    it('sessionIdが無効な形式の場合、エラーを返す', () => {
      // Given: 無効な形式のセッションID
      const invalidSessionIds = [
        faker.string.uuid(), // UUID形式（ses_プレフィックスなし）
        'invalid-id', // 完全に不正な形式
        'ses_', // プレフィックスのみ
        'ses_abc', // 短すぎる
        'ses_' + faker.string.alphanumeric(23), // 1文字短い
        'ses_' + faker.string.alphanumeric(25), // 1文字長い
        'SES_' + faker.string.alphanumeric(24), // 大文字プレフィックス
        'ses_' + faker.string.alphanumeric(24).toUpperCase(), // 大文字のCUID部分
      ]

      invalidSessionIds.forEach((invalidId) => {
        const input = {
          sessionId: invalidId,
        }

        // When: バリデーションを実行
        const result = completeShoppingSessionValidator.safeParse(input)

        // Then: バリデーションが失敗する
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Invalid session ID format')
        }
      })
    })

    it('sessionIdが未定義の場合、エラーを返す', () => {
      // Given: sessionIdなし
      const input = {}

      // When: バリデーションを実行
      const result = completeShoppingSessionValidator.safeParse(input)

      // Then: バリデーションが失敗する
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('sessionId')
      }
    })

    it('sessionIdがnullの場合、エラーを返す', () => {
      // Given: nullのsessionId
      const input = {
        sessionId: null,
      }

      // When: バリデーションを実行
      const result = completeShoppingSessionValidator.safeParse(input)

      // Then: バリデーションが失敗する
      expect(result.success).toBe(false)
    })

    it('sessionIdが空文字の場合、エラーを返す', () => {
      // Given: 空文字のsessionId
      const input = {
        sessionId: '',
      }

      // When: バリデーションを実行
      const result = completeShoppingSessionValidator.safeParse(input)

      // Then: バリデーションが失敗する
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid session ID format')
      }
    })
  })
})
