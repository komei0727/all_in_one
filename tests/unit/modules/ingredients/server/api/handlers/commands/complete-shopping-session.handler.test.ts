import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

import { CompleteShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/complete-shopping-session.handler'
import { type CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  NotFoundException,
  BusinessRuleException,
} from '@/modules/ingredients/server/domain/exceptions'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects/shopping-session-id.vo'

import { ShoppingSessionBuilder } from '../../../../../../../__fixtures__/builders/entities/shopping-session.builder'

describe('CompleteShoppingSessionApiHandler', () => {
  let handler: CompleteShoppingSessionApiHandler
  let mockCompleteShoppingSessionHandler: CompleteShoppingSessionHandler

  beforeEach(() => {
    mockCompleteShoppingSessionHandler = {
      handle: vi.fn(),
    } as unknown as CompleteShoppingSessionHandler

    handler = new CompleteShoppingSessionApiHandler(mockCompleteShoppingSessionHandler)
  })

  describe('validate', () => {
    describe('正常系', () => {
      it('有効なsessionIdを含むリクエストを検証できる', () => {
        // Given: 有効なsessionId
        const sessionId = ShoppingSessionId.create().getValue()
        const data = { sessionId }

        // When: バリデーションを実行
        const result = handler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual({ sessionId })
      })

      it('params形式のデータも処理できる', () => {
        // Given: params形式のデータ
        const sessionId = ShoppingSessionId.create().getValue()
        const data = { params: { sessionId } }

        // When: バリデーションを実行
        const result = handler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual({ sessionId })
      })
    })

    describe('異常系', () => {
      it('sessionIdが不正な形式の場合、バリデーションエラーが発生する', () => {
        // Given: 不正なsessionId
        const data = { sessionId: 'invalid-id' }

        // When/Then: バリデーションエラーが発生
        expect(() => handler.validate(data)).toThrow(ZodError)
      })

      it('sessionIdが欠落している場合、バリデーションエラーが発生する', () => {
        // Given: sessionIdなし
        const data = {}

        // When/Then: バリデーションエラーが発生
        expect(() => handler.validate(data)).toThrow(ZodError)
      })
    })
  })

  describe('execute', () => {
    describe('正常系', () => {
      it('有効なリクエストでセッションを完了できる', async () => {
        // Given: 有効なリクエストとモックレスポンス
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()

        const completedSession = new ShoppingSessionBuilder()
          .withId(sessionId)
          .withUserId(userId)
          .withCompletedStatus()
          .build()

        const sessionDto = new ShoppingSessionDto(
          completedSession.getId().getValue(),
          completedSession.getUserId(),
          completedSession.getStatus().getValue(),
          completedSession.getStartedAt().toISOString(),
          completedSession.getCompletedAt()?.toISOString() || null,
          completedSession.getDeviceType()?.getValue() || null,
          completedSession.getLocation()
            ? {
                name: completedSession.getLocationName() || undefined,
              }
            : null,
          []
        )

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockResolvedValueOnce(sessionDto)

        // When: ハンドラーを実行
        const result = await handler.execute({ sessionId }, userId)

        // Then: セッションDTOが返される
        expect(result).toBe(sessionDto)
        expect(mockCompleteShoppingSessionHandler.handle).toHaveBeenCalledWith({
          sessionId,
          userId,
        })
      })
    })

    describe('異常系', () => {
      it('セッションが見つからない場合、NotFoundExceptionがそのまま伝播する', async () => {
        // Given: 存在しないセッション
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const error = new NotFoundException('ShoppingSession', sessionId)

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({ sessionId }, userId)).rejects.toThrow(error)
      })

      it('ビジネスルール違反の場合、BusinessRuleExceptionがそのまま伝播する', async () => {
        // Given: 他のユーザーのセッション
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const error = new BusinessRuleException('このセッションを完了する権限がありません')

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({ sessionId }, userId)).rejects.toThrow(error)
      })

      it('既に完了済みのセッションの場合、BusinessRuleExceptionがそのまま伝播する', async () => {
        // Given: 完了済みセッション
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const error = new BusinessRuleException('既に完了済みのセッションです')

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({ sessionId }, userId)).rejects.toThrow(error)
      })
    })
  })

  describe('handle (統合)', () => {
    it('BaseApiHandlerの例外変換機能が正しく動作する', async () => {
      // Given: Zodバリデーションエラー
      const data = { sessionId: 'invalid-id' }
      const userId = faker.string.uuid()

      // When: handleメソッドを実行
      const resultPromise = handler.handle(data, userId)

      // Then: ApiValidationExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
      })
    })

    it('ドメイン例外が適切にAPI例外に変換される', async () => {
      // Given: NotFoundException
      const sessionId = ShoppingSessionId.create().getValue()
      const userId = faker.string.uuid()
      const error = new NotFoundException('ShoppingSession', sessionId)

      vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(error)

      // When: handleメソッドを実行
      const resultPromise = handler.handle({ sessionId }, userId)

      // Then: ApiNotFoundExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'RESOURCE_NOT_FOUND',
      })
    })
  })
})
