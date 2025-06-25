import { describe, it, expect, vi } from 'vitest'
import { ZodError } from 'zod'

import { ApiErrorHandler } from '@/modules/user-authentication/server/api/error-handler'

describe('ApiErrorHandler', () => {
  describe('handleError', () => {
    it('ZodErrorを400エラーに変換する', () => {
      // Arrange
      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: '表示名は必須です',
          path: ['displayName'],
        },
      ])

      // Act
      const response = ApiErrorHandler.handleError(zodError)

      // Assert
      expect(response.status).toBe(400)
    })

    it('ユーザーが見つからないエラーを404に変換する', () => {
      // Arrange
      const error = new Error('ユーザーが見つかりません')

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(404)
    })

    it('バリデーションエラーを400に変換する', () => {
      // Arrange
      const validationErrors = [
        new Error('表示名は必須です'),
        new Error('表示名は100文字以内で入力してください'),
        new Error('サポートされていない言語です'),
      ]

      validationErrors.forEach((error) => {
        // Act
        const response = ApiErrorHandler.handleError(error)

        // Assert
        expect(response.status).toBe(400)
      })
    })

    it('アカウント無効化エラーを403に変換する', () => {
      // Arrange
      const error = new Error('アカウントが無効化されています')

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(403)
    })

    it('既に無効化されたユーザーエラーを400に変換する', () => {
      // Arrange
      const error = new Error('既に無効化されたユーザーです')

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(400)
    })

    it('メールアドレス重複エラーを409に変換する', () => {
      // Arrange
      const error = new Error('メールアドレスが既に使用されています')

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(409)
    })

    it('未知のエラーを500に変換する', () => {
      // Arrange
      const error = new Error('予期しないエラー')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(500)
      expect(consoleSpy).toHaveBeenCalledWith('Unexpected error:', error)

      // Cleanup
      consoleSpy.mockRestore()
    })

    it('Error以外のオブジェクトも処理できる', () => {
      // Arrange
      const error = { message: 'Unknown error object' }
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(500)

      // Cleanup
      consoleSpy.mockRestore()
    })
  })

  describe('unauthorizedError', () => {
    it('401エラーレスポンスを生成する', () => {
      // Act
      const response = ApiErrorHandler.unauthorizedError()

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
