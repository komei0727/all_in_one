import { describe, it, expect } from 'vitest'

import { AppError } from '@/modules/shared/server/errors/app.error'

describe('AppError', () => {
  describe('エラーの作成', () => {
    it('メッセージのみでエラーを作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const error = new AppError('エラーが発生しました')

      // Assert（検証）
      expect(error.message).toBe('エラーが発生しました')
      expect(error.statusCode).toBe(500) // デフォルト値
      expect(error.code).toBeUndefined()
      expect(error.name).toBe('AppError')
    })

    it('メッセージとステータスコードでエラーを作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const error = new AppError('認証エラー', 401)

      // Assert（検証）
      expect(error.message).toBe('認証エラー')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBeUndefined()
    })

    it('すべてのパラメータを指定してエラーを作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const error = new AppError('バリデーションエラー', 400, 'VALIDATION_ERROR')

      // Assert（検証）
      expect(error.message).toBe('バリデーションエラー')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Errorクラスとの互換性', () => {
    it('Errorクラスのインスタンスである', () => {
      // Arrange & Act（準備 & 実行）
      const error = new AppError('テストエラー')

      // Assert（検証）
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
    })

    it('スタックトレースが生成される', () => {
      // Arrange & Act（準備 & 実行）
      const error = new AppError('スタックトレーステスト')

      // Assert（検証）
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AppError')
      expect(error.stack).toContain('スタックトレーステスト')
    })

    it('プロトタイプチェーンが正しく設定される', () => {
      // Arrange & Act（準備 & 実行）
      const error = new AppError('プロトタイプテスト')

      // Assert（検証）
      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype)
      expect(Object.getPrototypeOf(AppError.prototype)).toBe(Error.prototype)
    })
  })

  describe('異なるステータスコードのエラー', () => {
    it('4xx系のエラーを作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const badRequest = new AppError('不正なリクエスト', 400, 'BAD_REQUEST')
      const unauthorized = new AppError('認証が必要です', 401, 'UNAUTHORIZED')
      const forbidden = new AppError('アクセス禁止', 403, 'FORBIDDEN')
      const notFound = new AppError('見つかりません', 404, 'NOT_FOUND')

      // Assert（検証）
      expect(badRequest.statusCode).toBe(400)
      expect(unauthorized.statusCode).toBe(401)
      expect(forbidden.statusCode).toBe(403)
      expect(notFound.statusCode).toBe(404)
    })

    it('5xx系のエラーを作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const internalError = new AppError('内部エラー', 500, 'INTERNAL_ERROR')
      const notImplemented = new AppError('未実装', 501, 'NOT_IMPLEMENTED')
      const badGateway = new AppError('ゲートウェイエラー', 502, 'BAD_GATEWAY')
      const serviceUnavailable = new AppError('サービス利用不可', 503, 'SERVICE_UNAVAILABLE')

      // Assert（検証）
      expect(internalError.statusCode).toBe(500)
      expect(notImplemented.statusCode).toBe(501)
      expect(badGateway.statusCode).toBe(502)
      expect(serviceUnavailable.statusCode).toBe(503)
    })
  })

  describe('エラーコードの活用', () => {
    it('エラーコードによる分類が可能', () => {
      // Arrange（準備）
      const errors = [
        new AppError('エラー1', 400, 'VALIDATION_ERROR'),
        new AppError('エラー2', 401, 'AUTH_ERROR'),
        new AppError('エラー3', 400, 'VALIDATION_ERROR'),
        new AppError('エラー4', 500, 'SYSTEM_ERROR'),
      ]

      // Act（実行）
      const validationErrors = errors.filter((e) => e.code === 'VALIDATION_ERROR')
      const authErrors = errors.filter((e) => e.code === 'AUTH_ERROR')
      const systemErrors = errors.filter((e) => e.code === 'SYSTEM_ERROR')

      // Assert（検証）
      expect(validationErrors).toHaveLength(2)
      expect(authErrors).toHaveLength(1)
      expect(systemErrors).toHaveLength(1)
    })

    it('エラーコードなしのエラーも扱える', () => {
      // Arrange & Act（準備 & 実行）
      const error = new AppError('汎用エラー', 500)

      // Assert（検証）
      expect(error.code).toBeUndefined()
      expect(error.statusCode).toBe(500)
    })
  })
})
