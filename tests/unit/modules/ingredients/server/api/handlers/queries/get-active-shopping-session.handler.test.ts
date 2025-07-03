import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetActiveShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-active-shopping-session.handler'
import { ActiveShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/active-shopping-session.dto'
import { type GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'
import { NotFoundException } from '@/modules/ingredients/server/domain/exceptions'
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

  describe('validate', () => {
    it('空のオブジェクトを返す', () => {
      // Given: 任意のデータ
      const data = { someField: 'value' }

      // When: バリデーションを実行
      const result = handler.validate(data)

      // Then: 空のオブジェクトが返される
      expect(result).toEqual({})
    })
  })

  describe('execute', () => {
    describe('正常系', () => {
      it('アクティブなセッションが存在する場合、セッション情報を返す', async () => {
        // Given: アクティブなセッション
        const userId = testDataHelpers.userId()
        const sessionDto = new ActiveShoppingSessionDto(
          testDataHelpers.shoppingSessionId(),
          userId,
          'ACTIVE',
          faker.date.recent().toISOString(),
          'MOBILE',
          { name: 'スーパーマーケット' },
          [],
          300, // duration
          5, // checkedItemsCount
          faker.date.recent().toISOString() // lastActivityAt
        )

        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockResolvedValueOnce(sessionDto)

        // When: ハンドラーを実行
        const result = await handler.execute({}, userId)

        // Then: セッションDTOが返される
        expect(result).toBe(sessionDto)
        expect(mockGetActiveShoppingSessionHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({ userId })
        )
      })

      it('アクティブなセッションが存在しない場合、nullを返す', async () => {
        // Given: セッションが存在しない
        const userId = testDataHelpers.userId()
        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockResolvedValueOnce(null)

        // When: ハンドラーを実行
        const result = await handler.execute({}, userId)

        // Then: nullが返される
        expect(result).toBeNull()
      })
    })

    describe('異常系', () => {
      it('ドメイン例外が発生した場合、そのまま伝播する', async () => {
        // Given: ドメイン例外
        const userId = testDataHelpers.userId()
        const error = new NotFoundException('ShoppingSession', userId)
        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({}, userId)).rejects.toThrow(error)
      })

      it('予期しないエラーが発生した場合、そのまま伝播する', async () => {
        // Given: 予期しないエラー
        const userId = testDataHelpers.userId()
        const error = new Error('Database connection failed')
        vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({}, userId)).rejects.toThrow(error)
      })
    })
  })

  describe('handle (統合)', () => {
    it('BaseApiHandlerの例外変換機能が正しく動作する', async () => {
      // Given: 予期しないエラー
      const userId = testDataHelpers.userId()
      const error = new Error('Database error')
      vi.mocked(mockGetActiveShoppingSessionHandler.handle).mockRejectedValueOnce(error)

      // When: handleメソッドを実行
      const resultPromise = handler.handle({}, userId)

      // Then: ApiInternalExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 500,
        errorCode: 'INTERNAL_SERVER_ERROR',
      })
    })
  })
})
