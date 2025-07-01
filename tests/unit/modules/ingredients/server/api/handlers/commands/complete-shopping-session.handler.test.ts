import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CompleteShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/complete-shopping-session.handler'
import { type CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects/shopping-session-id.vo'
import { BusinessRuleException } from '@/modules/shared/server/domain/exceptions/business-rule.exception'
import { ResourceNotFoundException } from '@/modules/shared/server/domain/exceptions/resource-not-found.exception'

import { shoppingSessionBuilder } from '../../../../../../../__fixtures__/builders/shopping-session.builder'

describe('CompleteShoppingSessionApiHandler', () => {
  let handler: CompleteShoppingSessionApiHandler
  let mockCompleteShoppingSessionHandler: CompleteShoppingSessionHandler

  beforeEach(() => {
    mockCompleteShoppingSessionHandler = {
      handle: vi.fn(),
    } as unknown as CompleteShoppingSessionHandler

    handler = new CompleteShoppingSessionApiHandler(mockCompleteShoppingSessionHandler)
  })

  describe('handle', () => {
    describe('正常系', () => {
      it('有効なリクエストでセッションを完了できる', async () => {
        // Given: 有効なリクエストデータとレスポンス
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const completedSession = shoppingSessionBuilder()
          .withSessionId(sessionId)
          .withUserId(userId)
          .withCompletedStatus()
          .build()

        // ShoppingSessionDtoを返すようにモック
        const sessionDto = {
          sessionId: completedSession.getId().getValue(),
          userId: completedSession.getUserId(),
          status: completedSession.getStatus().getValue(),
          startedAt: completedSession.getStartedAt().toISOString(),
          completedAt: completedSession.getCompletedAt()?.toISOString() || null,
          deviceType: completedSession.getDeviceType()?.getValue() || null,
          location: completedSession.getLocation()
            ? {
                placeName: completedSession.getLocationName() || undefined,
              }
            : null,
        }

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockResolvedValueOnce(
          sessionDto as any
        )

        // When: ハンドラーを実行
        const response = await handler.handle(request, { sessionId }, userId)

        // Then: 正しいレスポンスが返される
        if (response.status !== 200) {
          const errorData = await response.json()
          console.error('Error response:', errorData)
        }
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual(sessionDto)

        // コマンドハンドラーが正しく呼ばれたことを確認
        expect(mockCompleteShoppingSessionHandler.handle).toHaveBeenCalledWith({
          sessionId,
          userId,
        })
      })
    })

    describe('異常系', () => {
      it('sessionIdが不正な形式の場合、バリデーションエラーを返す', async () => {
        // Given: 不正なsessionId
        const invalidSessionId = 'invalid-uuid'
        const userId = faker.string.uuid()
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, { sessionId: invalidSessionId }, userId)

        // Then: 400エラーが返される
        expect(response.status).toBe(400)
        const responseData = await response.json()
        expect(responseData.message).toContain('Validation failed')
      })

      it('セッションが見つからない場合、404エラーを返す', async () => {
        // Given: 存在しないセッション
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(
          new ResourceNotFoundException('ShoppingSession', sessionId)
        )

        // When: ハンドラーを実行
        const response = await handler.handle(request, { sessionId }, userId)

        // Then: 404エラーが返される
        expect(response.status).toBe(404)
        const responseData = await response.json()
        expect(responseData.message).toBe(`ShoppingSession with ID ${sessionId} not found`)
      })

      it('他のユーザーのセッションを完了しようとした場合、403エラーを返す', async () => {
        // Given: 権限のないセッション
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(
          new BusinessRuleException('You are not authorized to complete this session')
        )

        // When: ハンドラーを実行
        const response = await handler.handle(request, { sessionId }, userId)

        // Then: 403エラーが返される
        expect(response.status).toBe(403)
        const responseData = await response.json()
        expect(responseData.message).toBe('You are not authorized to complete this session')
      })

      it('既に完了したセッションの場合、409エラーを返す', async () => {
        // Given: 既に完了したセッション
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(
          new BusinessRuleException('Session is already completed')
        )

        // When: ハンドラーを実行
        const response = await handler.handle(request, { sessionId }, userId)

        // Then: 409エラーが返される
        expect(response.status).toBe(409)
        const responseData = await response.json()
        expect(responseData.message).toBe('Session is already completed')
      })

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        const sessionId = ShoppingSessionId.create().getValue()
        const userId = faker.string.uuid()
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        vi.mocked(mockCompleteShoppingSessionHandler.handle).mockRejectedValueOnce(
          new Error('Unexpected error')
        )

        // When: ハンドラーを実行
        const response = await handler.handle(request, { sessionId }, userId)

        // Then: 500エラーが返される
        expect(response.status).toBe(500)
        const responseData = await response.json()
        expect(responseData.message).toBe('Internal server error')
      })
    })
  })
})
