import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AbandonShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/abandon-shopping-session.handler'
import { AbandonShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/abandon-shopping-session.command'
import type { AbandonShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/abandon-shopping-session.handler'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { ApiBusinessRuleException } from '@/modules/shared/server/api/exceptions/api-business-rule.exception'
import { ApiInternalException } from '@/modules/shared/server/api/exceptions/api-internal.exception'
import { ApiNotFoundException } from '@/modules/shared/server/api/exceptions/api-not-found.exception'
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

      // BaseApiHandlerのhandleメソッドの新しいシグネチャで実行
      const requestData = { sessionId }
      const result = await apiHandler.handle(requestData, userId)

      // レスポンスの検証
      expect(result).toEqual(mockDto)

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
      const reason = '予定変更のため'
      const mockDto = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ABANDONED')
        .build()

      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // BaseApiHandlerのhandleメソッドの新しいシグネチャで実行
      const requestData = { sessionId, reason }
      const result = await apiHandler.handle(requestData, userId)

      // レスポンスの検証
      expect(result).toEqual(mockDto)

      // コマンドハンドラーが正しく呼び出されたことを確認
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          userId,
          reason,
        })
      )
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.any(AbandonShoppingSessionCommand)
      )
    })

    it('理由なしのデータでも処理できる', async () => {
      // テストデータの準備
      const sessionId = createValidSessionId()
      const userId = createUserId()
      const mockDto = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ABANDONED')
        .build()

      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // reasonなしのデータで実行
      const requestData = { sessionId }
      const result = await apiHandler.handle(requestData, userId)

      // レスポンスの検証
      expect(result).toEqual(mockDto)

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
  })

  describe('バリデーション', () => {
    it('無効な形式のセッションIDの場合はバリデーションエラーを投げる', async () => {
      const invalidSessionId = 'invalid-session-id'
      const userId = createUserId()

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle({ sessionId: invalidSessionId }, userId)).rejects.toThrow()

      // コマンドハンドラーが呼び出されないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('短すぎるセッションIDの場合はバリデーションエラーを投げる', async () => {
      const invalidSessionId = 'ses_123' // 20文字未満
      const userId = createUserId()

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle({ sessionId: invalidSessionId }, userId)).rejects.toThrow()

      // コマンドハンドラーが呼び出されないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })
  })

  describe('例外処理', () => {
    it('セッションが見つからない場合はNotFoundExceptionが伝播される', async () => {
      const sessionId = createValidSessionId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new NotFoundException('Session', 'Session not found')
      )

      // ApiNotFoundExceptionに変換されることを確認
      await expect(apiHandler.handle({ sessionId }, userId)).rejects.toThrow(ApiNotFoundException)

      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.any(AbandonShoppingSessionCommand)
      )
    })

    it('ビジネスルール違反の場合はBusinessRuleExceptionが伝播される', async () => {
      const sessionId = createValidSessionId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new BusinessRuleException('Cannot abandon completed session')
      )

      // ApiBusinessRuleExceptionに変換されることを確認
      await expect(apiHandler.handle({ sessionId }, userId)).rejects.toThrow(
        ApiBusinessRuleException
      )

      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.any(AbandonShoppingSessionCommand)
      )
    })

    it('予期しないエラーが発生した場合は適切に処理される', async () => {
      const sessionId = createValidSessionId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new Error('Unexpected database error')
      )

      // ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle({ sessionId }, userId)).rejects.toThrow(ApiInternalException)

      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.any(AbandonShoppingSessionCommand)
      )
    })
  })
})
