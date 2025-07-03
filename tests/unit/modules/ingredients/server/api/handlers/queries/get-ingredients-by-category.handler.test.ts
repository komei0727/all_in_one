import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetIngredientsByCategoryApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredients-by-category.handler'
import { IngredientsByCategoryDto } from '@/modules/ingredients/server/application/dtos/ingredients-by-category.dto'
import type { GetIngredientsByCategoryHandler } from '@/modules/ingredients/server/application/queries/get-ingredients-by-category.handler'
import { ApiValidationException } from '@/modules/shared/server/api/exceptions/api-validation.exception'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetIngredientsByCategoryApiHandler', () => {
  let mockQueryHandler: GetIngredientsByCategoryHandler
  let apiHandler: GetIngredientsByCategoryApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHandler = {
      handle: vi.fn(),
    } as unknown as GetIngredientsByCategoryHandler
    apiHandler = new GetIngredientsByCategoryApiHandler(mockQueryHandler)
  })

  // テストデータビルダー
  const createValidCategoryId = () => testDataHelpers.categoryId()
  const createUserId = () => faker.string.uuid()
  const createIngredientId = () => testDataHelpers.ingredientId()

  describe('正常系', () => {
    it('カテゴリー別の食材一覧が正常に取得できる', async () => {
      // Given: テストデータを準備
      const categoryId = createValidCategoryId()
      const userId = createUserId()
      const ingredientId1 = createIngredientId()
      const ingredientId2 = createIngredientId()

      const mockResponseDto = new IngredientsByCategoryDto(
        {
          id: categoryId,
          name: '野菜',
        },
        [
          {
            id: ingredientId1,
            name: 'トマト',
            stockStatus: 'IN_STOCK',
            expiryStatus: 'FRESH',
            lastCheckedAt: '2024-01-01T00:00:00.000Z',
            currentQuantity: {
              amount: 500,
              unit: {
                symbol: 'g',
              },
            },
          },
          {
            id: ingredientId2,
            name: 'レタス',
            stockStatus: 'LOW_STOCK',
            expiryStatus: 'EXPIRING_SOON',
            lastCheckedAt: '2024-01-01T00:00:00.000Z',
            currentQuantity: {
              amount: 1,
              unit: {
                symbol: '個',
              },
            },
          },
        ],
        {
          totalItems: 2,
          outOfStockCount: 0,
          lowStockCount: 1,
          expiringSoonCount: 1,
        }
      )

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockResponseDto)

      // When: APIハンドラーを実行
      const requestData = { categoryId, sortBy: 'stockStatus' }
      const result = await apiHandler.handle(requestData, userId)

      // Then: 正しい結果が返される（タイムスタンプは動的なので除外して比較）
      const expected = mockResponseDto.toJSON()
      expect(result.data).toEqual(expected.data)
      expect(result.meta.version).toEqual(expected.meta.version)
      expect(result.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

      // クエリハンドラーが正しく呼び出されることを確認
      expect(mockQueryHandler.handle).toHaveBeenCalledWith({
        categoryId,
        userId,
        sortBy: 'stockStatus',
      })
    })

    it('名前でソートされた食材一覧が取得できる', async () => {
      // Given: 名前でソートするリクエスト
      const categoryId = createValidCategoryId()
      const userId = createUserId()

      const mockResponseDto = new IngredientsByCategoryDto(
        {
          id: categoryId,
          name: '肉類',
        },
        [
          {
            id: createIngredientId(),
            name: '牛肉',
            stockStatus: 'IN_STOCK',
            currentQuantity: {
              amount: 300,
              unit: {
                symbol: 'g',
              },
            },
          },
          {
            id: createIngredientId(),
            name: '豚肉',
            stockStatus: 'IN_STOCK',
            currentQuantity: {
              amount: 500,
              unit: {
                symbol: 'g',
              },
            },
          },
        ],
        {
          totalItems: 2,
          outOfStockCount: 0,
          lowStockCount: 0,
          expiringSoonCount: 0,
        }
      )

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockResponseDto)

      // When: 名前でソートを指定
      const result = await apiHandler.handle({ categoryId, sortBy: 'name' }, userId)

      // Then: 名前でソートされた結果が返される（タイムスタンプは動的なので除外して比較）
      const expected = mockResponseDto.toJSON()
      expect(result.data).toEqual(expected.data)
      expect(result.meta.version).toEqual(expected.meta.version)
      expect(result.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(mockQueryHandler.handle).toHaveBeenCalledWith({
        categoryId,
        userId,
        sortBy: 'name',
      })
    })

    it('食材が存在しないカテゴリーの場合も正常に処理される', async () => {
      // Given: 空の食材リスト
      const categoryId = createValidCategoryId()
      const userId = createUserId()

      const mockResponseDto = new IngredientsByCategoryDto(
        {
          id: categoryId,
          name: '調味料',
        },
        [],
        {
          totalItems: 0,
          outOfStockCount: 0,
          lowStockCount: 0,
          expiringSoonCount: 0,
        }
      )

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockResponseDto)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle({ categoryId, sortBy: 'stockStatus' }, userId)

      // Then: 空の配列が返される
      expect(result.data.ingredients).toEqual([])
      expect(result.data.summary.totalItems).toBe(0)
    })
  })

  describe('バリデーション', () => {
    it('リクエストデータがnullの場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      await expect(apiHandler.handle(null, userId)).rejects.toThrow(ApiValidationException)

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('リクエストデータがオブジェクトでない場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      await expect(apiHandler.handle('invalid-data', userId)).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('categoryIdが含まれていない場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      await expect(apiHandler.handle({ sortBy: 'stockStatus' }, userId)).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('categoryIdが文字列でない場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      await expect(
        apiHandler.handle({ categoryId: 123, sortBy: 'stockStatus' }, userId)
      ).rejects.toThrow(ApiValidationException)

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('無効な形式のcategoryIdの場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()
      const invalidCategoryIds = [
        'invalid-id',
        'cat_', // プレフィックスのみ
        'cat_123', // 短すぎる
        'ing_clh3k89kg0000oa0rbkqm5y8u', // 間違ったプレフィックス
        'cat_' + 'a'.repeat(50), // 長すぎる
      ]

      for (const invalidId of invalidCategoryIds) {
        await expect(
          apiHandler.handle({ categoryId: invalidId, sortBy: 'stockStatus' }, userId)
        ).rejects.toThrow(ApiValidationException)
      }

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('sortByが含まれていない場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()
      const categoryId = createValidCategoryId()

      await expect(apiHandler.handle({ categoryId }, userId)).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('sortByが文字列でない場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()
      const categoryId = createValidCategoryId()

      await expect(apiHandler.handle({ categoryId, sortBy: 123 }, userId)).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('無効なsortBy値の場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()
      const categoryId = createValidCategoryId()
      const invalidSortByValues = ['invalid', 'date', 'price', 'quantity']

      for (const invalidSortBy of invalidSortByValues) {
        await expect(
          apiHandler.handle({ categoryId, sortBy: invalidSortBy }, userId)
        ).rejects.toThrow(ApiValidationException)
      }

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })
  })

  describe('例外処理', () => {
    it('カテゴリーが見つからない場合はNotFoundExceptionが伝播される', async () => {
      const categoryId = createValidCategoryId()
      const userId = createUserId()

      vi.mocked(mockQueryHandler.handle).mockRejectedValueOnce(new Error('Category not found'))

      // BaseApiHandlerがエラーをApiInternalExceptionに変換する
      await expect(
        apiHandler.handle({ categoryId, sortBy: 'stockStatus' }, userId)
      ).rejects.toThrow('An unexpected error occurred')

      expect(mockQueryHandler.handle).toHaveBeenCalled()
    })

    it('予期しないエラーが発生した場合は適切に処理される', async () => {
      const categoryId = createValidCategoryId()
      const userId = createUserId()

      vi.mocked(mockQueryHandler.handle).mockRejectedValueOnce(
        new Error('Unexpected database error')
      )

      // BaseApiHandlerがエラーをApiInternalExceptionに変換する
      await expect(
        apiHandler.handle({ categoryId, sortBy: 'stockStatus' }, userId)
      ).rejects.toThrow('An unexpected error occurred')

      expect(mockQueryHandler.handle).toHaveBeenCalled()
    })
  })
})
