import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetQuickAccessIngredientsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-quick-access-ingredients.handler'
import { type GetQuickAccessIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.handler'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetQuickAccessIngredientsApiHandler', () => {
  let handler: GetQuickAccessIngredientsApiHandler
  let mockGetQuickAccessIngredientsHandler: Pick<GetQuickAccessIngredientsHandler, 'handle'>

  beforeEach(() => {
    // モックハンドラーの作成
    mockGetQuickAccessIngredientsHandler = {
      handle: vi.fn(),
    }

    // APIハンドラーのインスタンス化
    handler = new GetQuickAccessIngredientsApiHandler(
      mockGetQuickAccessIngredientsHandler as GetQuickAccessIngredientsHandler
    )
  })

  describe('handle', () => {
    describe('正常系', () => {
      it('デフォルトリミット（20件）でクイックアクセス食材を取得できる', async () => {
        // Given: クイックアクセス食材データ
        const userId = testDataHelpers.userId()
        const mockIngredients = [
          {
            ingredientId: testDataHelpers.ingredientId(),
            ingredientName: faker.helpers.arrayElement(['牛乳', '卵', 'トマト', 'きゅうり']),
            checkCount: faker.number.int({ min: 1, max: 50 }),
            lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
            currentStockStatus: faker.helpers.arrayElement([
              'IN_STOCK',
              'LOW_STOCK',
              'OUT_OF_STOCK',
            ]),
            currentExpiryStatus: faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED']),
          },
          {
            ingredientId: testDataHelpers.ingredientId(),
            ingredientName: faker.helpers.arrayElement(['にんじん', '玉ねぎ', 'じゃがいも']),
            checkCount: faker.number.int({ min: 1, max: 50 }),
            lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
            currentStockStatus: faker.helpers.arrayElement([
              'IN_STOCK',
              'LOW_STOCK',
              'OUT_OF_STOCK',
            ]),
            currentExpiryStatus: faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED']),
          },
        ]

        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockResolvedValueOnce({
          recentlyChecked: mockIngredients.map((ing) => ({
            ...ing,
            categoryId: 'cat1',
            categoryName: '野菜',
          })),
          frequentlyChecked: mockIngredients.map((ing) => ({
            ...ing,
            categoryId: 'cat2',
            categoryName: '乳製品',
          })),
        })

        // When: ハンドラーを実行（デフォルトリミット）
        const response = await handler.handle({}, userId)

        // Then: クイックアクセス食材データが返される
        expect(response).toHaveProperty('recentlyChecked')
        expect(response).toHaveProperty('frequentlyChecked')
        expect(response.recentlyChecked[0]).toHaveProperty('name')
        expect(response.recentlyChecked[0]).toHaveProperty('categoryId')
        expect(response.recentlyChecked[0]).toHaveProperty('categoryName')

        // デフォルトリミットで呼ばれている
        expect(mockGetQuickAccessIngredientsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            limit: 20,
          })
        )
      })

      it('カスタムリミットを指定してクイックアクセス食材を取得できる', async () => {
        // Given: カスタムリミットのリクエスト
        const userId = testDataHelpers.userId()
        const limit = 20
        const mockIngredients = Array.from({ length: limit }, () => ({
          ingredientId: testDataHelpers.ingredientId(),
          ingredientName: faker.helpers.arrayElement([
            '牛乳',
            '卵',
            'トマト',
            'きゅうり',
            'にんじん',
          ]),
          checkCount: faker.number.int({ min: 1, max: 50 }),
          lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
          currentStockStatus: faker.helpers.arrayElement(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
          currentExpiryStatus: faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED']),
        }))

        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockResolvedValueOnce({
          recentlyChecked: mockIngredients
            .slice(0, Math.floor(limit / 2))
            .map((ing) => ({ ...ing, categoryId: 'cat1', categoryName: '野菜' })),
          frequentlyChecked: mockIngredients
            .slice(Math.floor(limit / 2))
            .map((ing) => ({ ...ing, categoryId: 'cat2', categoryName: '乳製品' })),
        })

        // When: ハンドラーを実行（カスタムリミット）
        const response = await handler.handle({ limit }, userId)

        // Then: 指定した件数のクイックアクセス食材データが返される
        expect(
          response.recentlyChecked.length + response.frequentlyChecked.length
        ).toBeLessThanOrEqual(limit * 2)

        // 指定リミットで呼ばれている
        expect(mockGetQuickAccessIngredientsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            limit,
          })
        )
      })

      it('空の結果が返された場合も正常にレスポンスを返す', async () => {
        // Given: 空の結果
        const userId = testDataHelpers.userId()
        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockResolvedValueOnce({
          recentlyChecked: [],
          frequentlyChecked: [],
        })

        // When: ハンドラーを実行（空のデータ）
        const response = await handler.handle({}, userId)

        // Then: 空のクイックアクセス食材データが返される
        expect(response).toEqual({
          recentlyChecked: [],
          frequentlyChecked: [],
        })
      })
    })

    describe('異常系', () => {
      it('limitが不正な形式の場合、バリデーションエラーを返す', async () => {
        // Given: 不正なリミットパラメータ
        const userId = testDataHelpers.userId()
        // When & Then: バリデーションエラーが発生する
        await expect(handler.handle({ limit: 'invalid' }, userId)).rejects.toThrow(
          'limitは有効な整数である必要があります'
        )
      })

      it('limitが範囲外（0以下）の場合、バリデーションエラーを返す', async () => {
        // Given: 範囲外のリミットパラメータ
        const userId = testDataHelpers.userId()
        // When & Then: バリデーションエラーが発生する
        await expect(handler.handle({ limit: 0 }, userId)).rejects.toThrow(
          'limitは1以上50以下である必要があります'
        )
      })

      it('limitが範囲外（50超）の場合、バリデーションエラーを返す', async () => {
        // Given: 範囲外のリミットパラメータ
        const userId = testDataHelpers.userId()
        // When & Then: バリデーションエラーが発生する
        await expect(handler.handle({ limit: 51 }, userId)).rejects.toThrow(
          'limitは1以上50以下である必要があります'
        )
      })

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        const userId = testDataHelpers.userId()
        const error = new Error('Database connection failed')
        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockRejectedValueOnce(error)

        // When & Then: APIエラーが発生する
        await expect(handler.handle({}, userId)).rejects.toThrow('An unexpected error occurred')
      })
    })
  })
})
