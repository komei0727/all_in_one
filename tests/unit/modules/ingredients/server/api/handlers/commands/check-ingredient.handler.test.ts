import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CheckIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/check-ingredient.handler'
import { CheckIngredientCommand } from '@/modules/ingredients/server/application/commands/check-ingredient.command'
import type { CheckIngredientHandler } from '@/modules/ingredients/server/application/commands/check-ingredient.handler'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { ApiBusinessRuleException } from '@/modules/shared/server/api/exceptions/api-business-rule.exception'
import { ApiInternalException } from '@/modules/shared/server/api/exceptions/api-internal.exception'
import { ApiNotFoundException } from '@/modules/shared/server/api/exceptions/api-not-found.exception'
import { shoppingSessionDtoBuilder } from '@tests/__fixtures__/builders/dtos/shopping-session-dto.builder'

describe('CheckIngredientApiHandler', () => {
  let mockCommandHandler: CheckIngredientHandler
  let apiHandler: CheckIngredientApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockCommandHandler = {
      handle: vi.fn(),
    } as unknown as CheckIngredientHandler
    apiHandler = new CheckIngredientApiHandler(mockCommandHandler)
  })

  // テストデータビルダー
  const createValidSessionId = () => faker.string.uuid()
  const createValidIngredientId = () => faker.string.uuid()
  const createUserId = () => faker.string.uuid()

  describe('正常系', () => {
    it('食材の確認が正常に実行される', async () => {
      // Given: テストデータを準備
      const sessionId = createValidSessionId()
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      const expectedResult = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ACTIVE')
        .build()

      vi.mocked(mockCommandHandler.handle).mockResolvedValue(expectedResult)

      // When: APIハンドラーを実行
      const requestData = { sessionId, ingredientId, userId }
      const result = await apiHandler.handle(requestData, userId)

      // Then: 正しい結果が返される
      expect(result).toEqual({ data: expectedResult })

      // コマンドハンドラーが正しく呼び出されることを確認
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(expect.any(CheckIngredientCommand))
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          ingredientId,
          userId,
        })
      )
    })

    it('複数の食材確認リクエストを処理できる', async () => {
      // Given: 複数のテストデータを準備
      const sessionId = createValidSessionId()
      const ingredientId1 = createValidIngredientId()
      const ingredientId2 = createValidIngredientId()
      const userId = createUserId()

      const expectedResult1 = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ACTIVE')
        .build()

      const expectedResult2 = shoppingSessionDtoBuilder()
        .withSessionId(sessionId)
        .withUserId(userId)
        .withStatus('ACTIVE')
        .build()

      vi.mocked(mockCommandHandler.handle)
        .mockResolvedValueOnce(expectedResult1)
        .mockResolvedValueOnce(expectedResult2)

      // When: 複数のAPIハンドラーを実行
      const result1 = await apiHandler.handle(
        { sessionId, ingredientId: ingredientId1, userId },
        userId
      )
      const result2 = await apiHandler.handle(
        { sessionId, ingredientId: ingredientId2, userId },
        userId
      )

      // Then: それぞれ正しい結果が返される
      expect(result1).toEqual({ data: expectedResult1 })
      expect(result2).toEqual({ data: expectedResult2 })

      expect(mockCommandHandler.handle).toHaveBeenCalledTimes(2)
    })
  })

  describe('バリデーション', () => {
    it('無効な形式のセッションIDの場合はバリデーションエラーを投げる', async () => {
      const invalidSessionId = 'invalid-session-id'
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(
        apiHandler.handle({ sessionId: invalidSessionId, ingredientId, userId }, userId)
      ).rejects.toThrow()

      // コマンドハンドラーが呼び出されないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('無効な形式の食材IDの場合はバリデーションエラーを投げる', async () => {
      const sessionId = createValidSessionId()
      const invalidIngredientId = 'invalid-ingredient-id'
      const userId = createUserId()

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(
        apiHandler.handle({ sessionId, ingredientId: invalidIngredientId, userId }, userId)
      ).rejects.toThrow()

      // コマンドハンドラーが呼び出されないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('ユーザーIDが不正な場合はバリデーションエラーを投げる', async () => {
      const sessionId = createValidSessionId()
      const ingredientId = createValidIngredientId()
      const invalidUserId = ''

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(
        apiHandler.handle({ sessionId, ingredientId, userId: invalidUserId }, invalidUserId)
      ).rejects.toThrow()

      // コマンドハンドラーが呼び出されないことを確認
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })
  })

  describe('例外処理', () => {
    it('セッションが見つからない場合はNotFoundExceptionが伝播される', async () => {
      const sessionId = createValidSessionId()
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new NotFoundException('Session', 'Session not found')
      )

      // ApiNotFoundExceptionに変換されることを確認
      await expect(apiHandler.handle({ sessionId, ingredientId, userId }, userId)).rejects.toThrow(
        ApiNotFoundException
      )

      expect(mockCommandHandler.handle).toHaveBeenCalledWith(expect.any(CheckIngredientCommand))
    })

    it('食材が見つからない場合はNotFoundExceptionが伝播される', async () => {
      const sessionId = createValidSessionId()
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new NotFoundException('Ingredient', 'Ingredient not found')
      )

      // ApiNotFoundExceptionに変換されることを確認
      await expect(apiHandler.handle({ sessionId, ingredientId, userId }, userId)).rejects.toThrow(
        ApiNotFoundException
      )

      expect(mockCommandHandler.handle).toHaveBeenCalledWith(expect.any(CheckIngredientCommand))
    })

    it('ビジネスルール違反の場合はBusinessRuleExceptionが伝播される', async () => {
      const sessionId = createValidSessionId()
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new BusinessRuleException('Session is already completed')
      )

      // ApiBusinessRuleExceptionに変換されることを確認
      await expect(apiHandler.handle({ sessionId, ingredientId, userId }, userId)).rejects.toThrow(
        ApiBusinessRuleException
      )

      expect(mockCommandHandler.handle).toHaveBeenCalledWith(expect.any(CheckIngredientCommand))
    })

    it('予期しないエラーが発生した場合は適切に処理される', async () => {
      const sessionId = createValidSessionId()
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(
        new Error('Unexpected database error')
      )

      // ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle({ sessionId, ingredientId, userId }, userId)).rejects.toThrow(
        ApiInternalException
      )

      expect(mockCommandHandler.handle).toHaveBeenCalledWith(expect.any(CheckIngredientCommand))
    })
  })
})
