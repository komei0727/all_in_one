import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import {
  ApiValidationException,
  ApiInternalException,
  type ErrorContext,
} from '@/modules/shared/server/api/exceptions'

// テスト用のAPIハンドラー実装
class TestApiHandler extends BaseApiHandler<
  { name: string; age: number },
  { id: string; message: string }
> {
  private readonly schema = z.object({
    name: z.string().min(1, '名前は必須です'),
    age: z.number().min(0, '年齢は0以上である必要があります'),
  })

  validate(data: unknown) {
    return this.schema.parse(data)
  }

  async execute(request: { name: string; age: number }, userId: string) {
    // テスト用の実装
    if (request.name === 'error') {
      throw new Error('テストエラー')
    }

    return {
      id: `${userId}-${request.name}`,
      message: `Hello ${request.name}, you are ${request.age} years old`,
    }
  }
}

// エラーを投げるテスト用ハンドラー
class ErrorTestApiHandler extends BaseApiHandler<any, any> {
  validate(data: unknown) {
    if (data === 'validation-error') {
      throw new Error('バリデーションエラー')
    }
    return data
  }

  async execute(request: any, _userId: string) {
    if (request === 'execution-error') {
      throw new Error('実行エラー')
    }
    return { success: true }
  }
}

describe('BaseApiHandler', () => {
  describe('正常なケース', () => {
    it('バリデーション成功時、ビジネスロジックを実行して結果を返す', async () => {
      // Given: 有効なリクエストデータ
      const handler = new TestApiHandler()
      const requestData = { name: 'John', age: 25 }
      const userId = 'user123'

      // When: ハンドラーを実行
      const result = await handler.handle(requestData, userId)

      // Then: 期待される結果が返される
      expect(result).toEqual({
        id: 'user123-John',
        message: 'Hello John, you are 25 years old',
      })
    })

    it('コンテキスト情報が正しく設定される', async () => {
      // Given: ハンドラーとコンテキスト
      const handler = new TestApiHandler()
      const requestData = { name: 'Jane', age: 30 }
      const userId = 'user456'
      const context: ErrorContext = { path: '/api/test', method: 'POST' }

      // When: ハンドラーを実行
      const result = await handler.handle(requestData, userId, context)

      // Then: 結果が返される（コンテキストは内部で使用される）
      expect(result).toEqual({
        id: 'user456-Jane',
        message: 'Hello Jane, you are 30 years old',
      })
    })
  })

  describe('バリデーションエラーのケース', () => {
    it('ZodバリデーションエラーをApiValidationExceptionに変換する', async () => {
      // Given: 無効なリクエストデータ
      const handler = new TestApiHandler()
      const invalidData = { name: '', age: -1 } // 無効なデータ
      const userId = 'user123'

      // When & Then: バリデーションエラーが発生
      await expect(handler.handle(invalidData, userId)).rejects.toThrow(ApiValidationException)

      try {
        await handler.handle(invalidData, userId)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationException)
        expect((error as ApiValidationException).statusCode).toBe(400)
        expect((error as ApiValidationException).errorCode).toBe('VALIDATION_ERROR')
        expect((error as ApiValidationException).context?.handler).toBe('TestApiHandler')
        expect((error as ApiValidationException).context?.userId).toBe('user123')
      }
    })

    it('バリデーション中の例外をApiInternalExceptionに変換する', async () => {
      // Given: バリデーション中にエラーを投げるハンドラー
      const handler = new ErrorTestApiHandler()
      const userId = 'user123'

      // When & Then: 内部エラーが発生
      await expect(handler.handle('validation-error', userId)).rejects.toThrow(ApiInternalException)

      try {
        await handler.handle('validation-error', userId)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiInternalException)
        expect((error as ApiInternalException).context?.handler).toBe('ErrorTestApiHandler')
      }
    })
  })

  describe('実行エラーのケース', () => {
    it('実行中の例外をApiInternalExceptionに変換する', async () => {
      // Given: 実行中にエラーを投げるハンドラー
      const handler = new ErrorTestApiHandler()
      const userId = 'user123'

      // When & Then: 実行エラーが発生
      await expect(handler.handle('execution-error', userId)).rejects.toThrow(ApiInternalException)

      try {
        await handler.handle('execution-error', userId)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiInternalException)
        expect((error as ApiInternalException).context?.handler).toBe('ErrorTestApiHandler')
        expect((error as ApiInternalException).context?.userId).toBe('user123')
      }
    })

    it('ビジネスロジック内のエラーをApiInternalExceptionに変換する', async () => {
      // Given: ビジネスロジックでエラーを投げる
      const handler = new TestApiHandler()
      const requestData = { name: 'error', age: 25 } // 'error'の場合エラーを投げる
      const userId = 'user123'

      // When & Then: 実行エラーが発生
      await expect(handler.handle(requestData, userId)).rejects.toThrow(ApiInternalException)
    })
  })

  describe('ヘルパーメソッド', () => {
    it('validateOnlyでバリデーションのみを実行できる', () => {
      // Given: 有効なデータ
      const handler = new TestApiHandler()
      const validData = { name: 'John', age: 25 }

      // When: バリデーションのみ実行
      const result = handler.validateOnly(validData)

      // Then: バリデーション済みデータが返される
      expect(result).toEqual(validData)
    })

    it('validateOnlyで無効なデータの場合は例外が投げられる', () => {
      // Given: 無効なデータ
      const handler = new TestApiHandler()
      const invalidData = { name: '', age: -1 }

      // When & Then: バリデーションエラーが発生
      expect(() => handler.validateOnly(invalidData)).toThrow()
    })

    it('executeOnlyでビジネスロジックのみを実行できる', async () => {
      // Given: バリデーション済みデータ
      const handler = new TestApiHandler()
      const validatedData = { name: 'John', age: 25 }
      const userId = 'user123'

      // When: ビジネスロジックのみ実行
      const result = await handler.executeOnly(validatedData, userId)

      // Then: 期待される結果が返される
      expect(result).toEqual({
        id: 'user123-John',
        message: 'Hello John, you are 25 years old',
      })
    })
  })

  describe('コンテキスト情報の拡張', () => {
    it('エラー発生時にハンドラー名とユーザーIDがコンテキストに追加される', async () => {
      // Given: エラーを発生させるハンドラー
      const handler = new ErrorTestApiHandler()
      const userId = 'user789'
      const originalContext: ErrorContext = {
        method: 'POST',
        path: '/api/test',
      }

      // When & Then: エラーが発生し、コンテキストが拡張される
      try {
        await handler.handle('execution-error', userId, originalContext)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiInternalException)
        const apiError = error as ApiInternalException
        expect(apiError.context?.handler).toBe('ErrorTestApiHandler')
        expect(apiError.context?.userId).toBe('user789')
        expect(apiError.context?.method).toBe('POST')
        expect(apiError.context?.path).toBe('/api/test')
      }
    })
  })
})
