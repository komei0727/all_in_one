import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AbandonShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/abandon-shopping-session.handler'
import { AbandonShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/abandon-shopping-session.command'
import type { AbandonShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/abandon-shopping-session.handler'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { shoppingSessionDtoBuilder } from '@tests/__fixtures__/builders/dtos/shopping-session-dto.builder'

describe('AbandonShoppingSessionApiHandler', () => {
  let mockCommandHandler: AbandonShoppingSessionHandler
  let apiHandler: AbandonShoppingSessionApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockCommandHandler = {
      handle: vi.fn(),
    } as unknown as AbandonShoppingSessionHandler
    apiHandler = new AbandonShoppingSessionApiHandler(mockCommandHandler)
  })

  // テストデータビルダー
  const createValidSessionId = () => `ses_${faker.string.alphanumeric(20)}`
  const createUserId = () => faker.string.uuid()

  const createMockRequest = (body?: unknown) => {
    const request = new Request('http://localhost:3000/api/v1/shopping-sessions/abandon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return request
  }

  describe('正常系', () => {
    it('理由なしで買い物セッションを中断できる', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()
      const mockDto = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ABANDONED')
        .build()

      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // 空のリクエストボディで実行
      const request = createMockRequest()
      const response = await apiHandler.handle(request, { sessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toEqual(mockDto.toJSON().data)

      // コマンドハンドラーが正しく呼び出されたことを確認
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          userId,
          reason: undefined,
        })
      )
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.any(AbandonShoppingSessionCommand)
      )
    })

    it('理由を指定して買い物セッションを中断できる', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()
      const reason = faker.lorem.sentence()
      const mockDto = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ABANDONED')
        .build()

      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // 理由を含むリクエストボディで実行
      const request = createMockRequest({ reason })
      const response = await apiHandler.handle(request, { sessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toEqual(mockDto.toJSON().data)

      // コマンドハンドラーが理由付きで呼び出されたことを確認
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          userId,
          reason,
        })
      )
    })

    it('無効なJSONボディでも処理を継続する', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()
      const mockDto = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ABANDONED')
        .build()

      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // 無効なJSONのリクエスト
      const request = new Request('http://localhost:3000/api/v1/shopping-sessions/abandon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })
      const response = await apiHandler.handle(request, { sessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData).toEqual(mockDto.toJSON().data)

      // コマンドハンドラーが理由なしで呼び出されたことを確認
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          userId,
          reason: undefined,
        })
      )
    })
  })

  describe('バリデーション', () => {
    it('無効な形式のセッションIDの場合は400エラーを返す', async () => {
      // 無効なセッションID（プレフィックスなし）
      const invalidSessionId = faker.string.alphanumeric(20)
      const userId = createUserId()

      const request = createMockRequest()
      const response = await apiHandler.handle(request, { sessionId: invalidSessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: 'Validation failed',
        errors: [
          {
            path: ['sessionId'],
            message: 'Invalid session ID format',
          },
        ],
      })

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('短すぎるセッションIDの場合は400エラーを返す', async () => {
      // 短すぎるセッションID
      const invalidSessionId = `ses_${faker.string.alphanumeric(10)}`
      const userId = createUserId()

      const request = createMockRequest()
      const response = await apiHandler.handle(request, { sessionId: invalidSessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toBe('Validation failed')

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('長すぎるセッションIDの場合は400エラーを返す', async () => {
      // 長すぎるセッションID
      const invalidSessionId = `ses_${faker.string.alphanumeric(35)}`
      const userId = createUserId()

      const request = createMockRequest()
      const response = await apiHandler.handle(request, { sessionId: invalidSessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toBe('Validation failed')

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })
  })

  describe('異常系', () => {
    it('セッションが見つからない場合は404エラーを返す', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new NotFoundException('Shopping session', sessionId)
      )

      const request = createMockRequest()
      const response = await apiHandler.handle(request, { sessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(404)
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: `Shopping session not found: ${sessionId}`,
      })
    })

    it('ビジネスルール違反の場合は409エラーを返す', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new BusinessRuleException('Session is already completed')
      )

      const request = createMockRequest()
      const response = await apiHandler.handle(request, { sessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(409)
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: 'Session is already completed',
      })
    })

    it('予期しないエラーの場合は500エラーを返す', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new Error('Unexpected database error')
      )

      const request = createMockRequest()
      const response = await apiHandler.handle(request, { sessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(500)
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: 'Internal server error',
      })
    })

    it('理由が文字列以外の場合は無視される', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()
      const mockDto = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ABANDONED')
        .build()

      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // 数値の理由を含むリクエストボディ
      const request = createMockRequest({ reason: 123 })
      const response = await apiHandler.handle(request, { sessionId }, userId)

      // レスポンスの検証
      expect(response.status).toBe(200)

      // コマンドハンドラーが理由として数値で呼び出されたことを確認
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          userId,
          reason: 123,
        })
      )
    })
  })
})
