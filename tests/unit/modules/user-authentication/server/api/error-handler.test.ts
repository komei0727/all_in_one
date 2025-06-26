import { describe, it, expect, vi } from 'vitest'
import { ZodError } from 'zod'

import { ApiErrorHandler } from '@/modules/user-authentication/server/api/error-handler'
import {
  UserNotFoundException,
  RequiredFieldException,
  InvalidFieldException,
  InvalidLanguageException,
  AccountDeactivatedException,
  AlreadyDeactivatedException,
  EmailAlreadyExistsException,
} from '@/modules/user-authentication/server/domain/exceptions'

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
      const error = new UserNotFoundException({ userId: 'test-user-123' })

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(404)
    })

    it('バリデーションエラーを400に変換する', () => {
      // Arrange
      const validationErrors = [
        new RequiredFieldException('displayName'),
        new InvalidFieldException(
          'displayName',
          'test-name',
          '表示名は100文字以内で入力してください'
        ),
        new InvalidLanguageException('invalid-lang'),
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
      const error = new AccountDeactivatedException('test-user-123')

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(403)
    })

    it('既に無効化されたユーザーエラーを422に変換する', () => {
      // Arrange
      const error = new AlreadyDeactivatedException('test-user-123')

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(422)
    })

    it('メールアドレス重複エラーを422に変換する', () => {
      // Arrange
      const error = new EmailAlreadyExistsException('test@example.com')

      // Act
      const response = ApiErrorHandler.handleError(error)

      // Assert
      expect(response.status).toBe(422)
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
