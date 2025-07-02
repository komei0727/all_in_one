import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CheckIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/check-ingredient.handler'
import type { CheckIngredientHandler } from '@/modules/ingredients/server/application/commands/check-ingredient.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'

describe('CheckIngredientApiHandler', () => {
  let apiHandler: CheckIngredientApiHandler
  let mockCommandHandler: CheckIngredientHandler
  let userId: string
  let sessionId: string
  let ingredientId: string

  beforeEach(() => {
    userId = faker.string.uuid()
    sessionId = faker.string.uuid()
    ingredientId = faker.string.uuid()

    mockCommandHandler = {
      handle: vi.fn(),
    } as unknown as CheckIngredientHandler

    apiHandler = new CheckIngredientApiHandler(mockCommandHandler)
  })

  describe('handle', () => {
    describe('正常系', () => {
      it('食材を正常にチェックできる', async () => {
        // Given: 正常なリクエスト
        const expectedDto = new ShoppingSessionDto(
          sessionId,
          userId,
          'ACTIVE',
          new Date().toISOString(),
          null,
          null,
          null,
          []
        )

        vi.mocked(mockCommandHandler.handle).mockResolvedValue(expectedDto)

        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, ingredientId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual({
          data: {
            data: {
              sessionId: expectedDto.sessionId,
              userId: expectedDto.userId,
              status: expectedDto.status,
              startedAt: expectedDto.startedAt,
              completedAt: expectedDto.completedAt,
              deviceType: expectedDto.deviceType,
              location: expectedDto.location,
              checkedItems: expectedDto.checkedItems,
            },
          },
        })

        // 正しいコマンドが呼ばれる
        expect(mockCommandHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId,
            ingredientId,
            userId,
          })
        )
      })
    })

    describe('異常系', () => {
      it('ingredientIdが無効な場合は400エラー', async () => {
        // Given: 無効なingredientId
        const invalidIngredientId = 'invalid-id'
        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, invalidIngredientId)

        // Then: 400エラーが返される
        expect(response.status).toBe(400)
        const responseData = await response.json()
        expect(responseData.message).toBe('Validation failed')
        expect(responseData.errors).toBeDefined()
      })

      it('セッションが見つからない場合は404エラー', async () => {
        // Given: 存在しないセッション
        vi.mocked(mockCommandHandler.handle).mockRejectedValue(
          new NotFoundException('買い物セッション', sessionId)
        )

        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, ingredientId)

        // Then: 404エラーが返される
        expect(response.status).toBe(404)
        const responseData = await response.json()
        expect(responseData.message).toContain('買い物セッション')
      })

      it('食材が見つからない場合は404エラー', async () => {
        // Given: 存在しない食材
        vi.mocked(mockCommandHandler.handle).mockRejectedValue(
          new NotFoundException('食材', ingredientId)
        )

        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, ingredientId)

        // Then: 404エラーが返される
        expect(response.status).toBe(404)
        const responseData = await response.json()
        expect(responseData.message).toContain('食材')
      })

      it('権限がない場合は400エラー', async () => {
        // Given: 権限のないユーザー
        vi.mocked(mockCommandHandler.handle).mockRejectedValue(
          new BusinessRuleException('このセッションで食材を確認する権限がありません')
        )

        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, ingredientId)

        // Then: 400エラーが返される
        expect(response.status).toBe(400)
        const responseData = await response.json()
        expect(responseData.message).toBe('このセッションで食材を確認する権限がありません')
      })

      it('セッションがアクティブでない場合は400エラー', async () => {
        // Given: 非アクティブなセッション
        vi.mocked(mockCommandHandler.handle).mockRejectedValue(
          new BusinessRuleException('アクティブでないセッションで食材を確認することはできません')
        )

        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, ingredientId)

        // Then: 400エラーが返される
        expect(response.status).toBe(400)
        const responseData = await response.json()
        expect(responseData.message).toBe(
          'アクティブでないセッションで食材を確認することはできません'
        )
      })

      it('既にチェック済みの食材の場合は400エラー', async () => {
        // Given: 既にチェック済みの食材
        vi.mocked(mockCommandHandler.handle).mockRejectedValue(
          new BusinessRuleException('この食材は既にチェック済みです')
        )

        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, ingredientId)

        // Then: 400エラーが返される
        expect(response.status).toBe(400)
        const responseData = await response.json()
        expect(responseData.message).toBe('この食材は既にチェック済みです')
      })

      it('予期しないエラーの場合は500エラー', async () => {
        // Given: 予期しないエラー
        vi.mocked(mockCommandHandler.handle).mockRejectedValue(new Error('Unexpected error'))

        const request = new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: APIハンドラーを実行
        const response = await apiHandler.handle(request, userId, sessionId, ingredientId)

        // Then: 500エラーが返される
        expect(response.status).toBe(500)
        const responseData = await response.json()
        expect(responseData.message).toBe('Internal server error')
      })
    })
  })
})
