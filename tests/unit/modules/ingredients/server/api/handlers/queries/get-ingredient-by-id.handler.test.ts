import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetIngredientByIdApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredient-by-id.handler'
import type { GetIngredientByIdHandler } from '@/modules/ingredients/server/application/queries/get-ingredient-by-id.handler'
import { GetIngredientByIdQuery } from '@/modules/ingredients/server/application/queries/get-ingredient-by-id.query'
import { NotFoundException } from '@/modules/ingredients/server/domain/exceptions'
import { ApiNotFoundException } from '@/modules/shared/server/api/exceptions/api-not-found.exception'
import { ApiValidationException } from '@/modules/shared/server/api/exceptions/api-validation.exception'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetIngredientByIdApiHandler', () => {
  let mockQueryHandler: GetIngredientByIdHandler
  let apiHandler: GetIngredientByIdApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHandler = {
      execute: vi.fn(),
    } as unknown as GetIngredientByIdHandler
    apiHandler = new GetIngredientByIdApiHandler(mockQueryHandler)
  })

  // テストデータビルダー
  const createValidIngredientId = () => testDataHelpers.ingredientId()
  const createUserId = () => faker.string.uuid()

  describe('正常系', () => {
    it('食材の詳細情報が正常に取得できる', async () => {
      // Given: テストデータを準備
      const ingredientId = createValidIngredientId()
      const userId = createUserId()
      const categoryId = testDataHelpers.categoryId()

      const mockIngredientDetailView = {
        id: ingredientId,
        userId,
        name: '豚肉',
        categoryId: categoryId,
        categoryName: '肉類',
        price: 500,
        purchaseDate: '2024-01-01T00:00:00.000Z',
        bestBeforeDate: '2024-01-10T00:00:00.000Z',
        useByDate: '2024-01-15T00:00:00.000Z',
        quantity: 300,
        unitId: 'unit1',
        unitName: 'グラム',
        unitSymbol: 'g',
        storageType: 'FRIDGE',
        storageDetail: '冷蔵庫上段',
        threshold: 100,
        memo: 'セール品',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const expectedResponse = {
        ingredient: {
          id: ingredientId,
          userId,
          name: '豚肉',
          category: {
            id: categoryId,
            name: '肉類',
          },
          price: 500,
          purchaseDate: '2024-01-01T00:00:00.000Z',
          expiryInfo: {
            bestBeforeDate: '2024-01-10T00:00:00.000Z',
            useByDate: '2024-01-15T00:00:00.000Z',
          },
          stock: {
            quantity: 300,
            unit: {
              id: 'unit1',
              name: 'グラム',
              symbol: 'g',
            },
            storageLocation: {
              type: 'FRIDGE',
              detail: '冷蔵庫上段',
            },
            threshold: 100,
          },
          memo: 'セール品',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      }

      vi.mocked(mockQueryHandler.execute).mockResolvedValue(mockIngredientDetailView)

      // When: APIハンドラーを実行
      const requestData = { id: ingredientId }
      const result = await apiHandler.handle(requestData, userId)

      // Then: 正しい結果が返される
      expect(result).toEqual(expectedResponse)

      // クエリハンドラーが正しく呼び出されることを確認
      expect(mockQueryHandler.execute).toHaveBeenCalledWith(expect.any(GetIngredientByIdQuery))
      expect(mockQueryHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          id: ingredientId,
        })
      )
    })

    it('カテゴリーがnullの場合も正常に処理される', async () => {
      // Given: カテゴリーなしの食材
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      const mockIngredientDetailView = {
        id: ingredientId,
        userId,
        name: 'その他食材',
        categoryId: null,
        categoryName: null,
        price: null,
        purchaseDate: '2024-01-01T00:00:00.000Z',
        bestBeforeDate: null,
        useByDate: null,
        quantity: 1,
        unitId: 'unit1',
        unitName: '個',
        unitSymbol: '個',
        storageType: 'ROOM_TEMP',
        storageDetail: null,
        threshold: null,
        memo: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      vi.mocked(mockQueryHandler.execute).mockResolvedValue(mockIngredientDetailView)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle({ id: ingredientId }, userId)

      // Then: nullフィールドが正しく処理される
      expect(result.ingredient.category).toBeNull()
      expect(result.ingredient.price).toBeNull()
      expect(result.ingredient.expiryInfo).toBeNull()
      expect(result.ingredient.memo).toBeNull()
    })
  })

  describe('バリデーション', () => {
    it('リクエストデータがnullの場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle(null, userId)).rejects.toThrow(ApiValidationException)

      // クエリハンドラーが呼び出されないことを確認
      expect(mockQueryHandler.execute).not.toHaveBeenCalled()
    })

    it('IDが含まれていない場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      await expect(apiHandler.handle({}, userId)).rejects.toThrow(ApiValidationException)

      expect(mockQueryHandler.execute).not.toHaveBeenCalled()
    })

    it('IDが文字列でない場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      await expect(apiHandler.handle({ id: 123 }, userId)).rejects.toThrow(ApiValidationException)

      expect(mockQueryHandler.execute).not.toHaveBeenCalled()
    })

    it('無効な形式のIDの場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()
      const invalidIds = [
        'invalid-id',
        'ing_', // プレフィックスのみ
        'ing_123', // 短すぎる
        'foo_clh3k89kg0000oa0rbkqm5y8u', // 間違ったプレフィックス
        'ing_CLHT68VNG00011E01CGNFHD2D', // 大文字を含む（CUID v2は小文字のみ）
        'ing_clh3k89kg0000oa0rbkqm5y8u123', // 長すぎる
      ]

      for (const invalidId of invalidIds) {
        await expect(apiHandler.handle({ id: invalidId }, userId)).rejects.toThrow(
          ApiValidationException
        )
      }

      expect(mockQueryHandler.execute).not.toHaveBeenCalled()
    })

    it('データが文字列の場合はバリデーションエラーを投げる', async () => {
      const userId = createUserId()

      await expect(apiHandler.handle('invalid-data', userId)).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.execute).not.toHaveBeenCalled()
    })
  })

  describe('例外処理', () => {
    it('食材が見つからない場合はNotFoundExceptionが伝播される', async () => {
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      vi.mocked(mockQueryHandler.execute).mockRejectedValueOnce(
        new NotFoundException('食材', 'Ingredient not found')
      )

      // ApiNotFoundExceptionに変換されることを確認
      await expect(apiHandler.handle({ id: ingredientId }, userId)).rejects.toThrow(
        ApiNotFoundException
      )

      expect(mockQueryHandler.execute).toHaveBeenCalledWith(expect.any(GetIngredientByIdQuery))
    })

    it('他のユーザーの食材にアクセスした場合はNotFoundExceptionが伝播される', async () => {
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      vi.mocked(mockQueryHandler.execute).mockRejectedValueOnce(
        new NotFoundException('食材', 'Access denied to other user ingredient')
      )

      await expect(apiHandler.handle({ id: ingredientId }, userId)).rejects.toThrow(
        ApiNotFoundException
      )

      expect(mockQueryHandler.execute).toHaveBeenCalledWith(expect.any(GetIngredientByIdQuery))
    })

    it('予期しないエラーが発生した場合は適切に処理される', async () => {
      const ingredientId = createValidIngredientId()
      const userId = createUserId()

      vi.mocked(mockQueryHandler.execute).mockRejectedValueOnce(
        new Error('Unexpected database error')
      )

      // BaseApiHandlerがエラーをApiInternalExceptionに変換する
      await expect(apiHandler.handle({ id: ingredientId }, userId)).rejects.toThrow(
        'An unexpected error occurred'
      )

      expect(mockQueryHandler.execute).toHaveBeenCalledWith(expect.any(GetIngredientByIdQuery))
    })
  })
})
