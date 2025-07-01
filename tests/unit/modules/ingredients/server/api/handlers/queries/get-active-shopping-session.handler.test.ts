import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetActiveShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-active-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { type GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetActiveShoppingSessionApiHandler', () => {
  let handler: GetActiveShoppingSessionApiHandler
  let mockGetActiveShoppingSessionHandler: Pick<GetActiveShoppingSessionHandler, 'handle'>

  beforeEach(() => {
    // モックハンドラーの作成
    mockGetActiveShoppingSessionHandler = {
      handle: vi.fn(),
    }

    // APIハンドラーのインスタンス化
    handler = new GetActiveShoppingSessionApiHandler(
      mockGetActiveShoppingSessionHandler as GetActiveShoppingSessionHandler
    )
  })

  describe('handle', () => {
    describe('正常系', () => {
      it('アクティブなセッションが存在する場合、セッション情報を返す', async () => {
        // Given: アクティブなセッション
        const userId = testDataHelpers.userId()
        const sessionDto = new ShoppingSessionDto(
          testDataHelpers.shoppingSessionId(),
          userId,
          'ACTIVE',
          faker.date.recent().toISOString(),
          null,
          'MOBILE',
          { placeName: 'スーパーマーケット' },
          []
        )

        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockResolvedValueOnce(sessionDto)

        const request = new Request(`http://localhost?userId=${userId}`, {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual({
          sessionId: sessionDto.sessionId,
          userId: sessionDto.userId,
          status: sessionDto.status,
          startedAt: sessionDto.startedAt,
          completedAt: sessionDto.completedAt,
          deviceType: sessionDto.deviceType,
          location: sessionDto.location,
        })
      })

      it('locationがnullの場合でも正常に返す', async () => {
        // Given: locationがnullのセッション
        const userId = testDataHelpers.userId()
        const sessionDto = new ShoppingSessionDto(
          testDataHelpers.shoppingSessionId(),
          userId,
          'ACTIVE',
          faker.date.recent().toISOString(),
          null,
          null,
          null,
          []
        )

        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockResolvedValueOnce(sessionDto)

        const request = new Request(`http://localhost?userId=${userId}`, {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData.deviceType).toBeNull()
        expect(responseData.location).toBeNull()
      })
    })

    describe('異常系', () => {
      it('アクティブなセッションが存在しない場合、404エラーを返す', async () => {
        // Given: セッションが存在しない
        const userId = testDataHelpers.userId()
        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockResolvedValueOnce(null)

        const request = new Request(`http://localhost?userId=${userId}`, {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 404エラーが返される
        expect(response.status).toBe(404)
        const responseData = await response.json()
        expect(responseData.message).toBe('No active shopping session found')
      })

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        const userId = testDataHelpers.userId()
        const error = new Error('Database connection failed')
        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockRejectedValueOnce(error)

        const request = new Request(`http://localhost?userId=${userId}`, {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 500エラーが返される
        expect(response.status).toBe(500)
        const responseData = await response.json()
        expect(responseData.message).toBe('Internal server error')
      })
    })
  })
})
