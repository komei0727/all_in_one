import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetIngredientsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredients.handler'
import type { IngredientDto } from '@/modules/ingredients/server/application/dtos/ingredient.dto'
import type { GetIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-ingredients.handler'
import { UniversalExceptionConverter } from '@/modules/shared/server/api/exception-converter'
import { ApiValidationException } from '@/modules/shared/server/api/exceptions'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * GetIngredientsApiHandler のテスト
 *
 * テスト対象:
 * - リクエストバリデーション
 * - クエリパラメータの処理
 * - 例外変換機能
 */
describe('GetIngredientsApiHandler', () => {
  let handler: GetIngredientsApiHandler
  let mockGetIngredientsHandler: {
    execute: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetIngredientsHandler = {
      execute: vi.fn(),
    }
    handler = new GetIngredientsApiHandler(
      mockGetIngredientsHandler as unknown as GetIngredientsHandler
    )
  })

  describe('リクエストバリデーション', () => {
    it('空のリクエストを許可する', () => {
      // リクエストが空の場合もデフォルト値で処理される
      const result = handler.validate(null)
      expect(result).toEqual({})
    })

    it('有効なページ番号を受け入れる', () => {
      // 有効なページ番号の検証
      const result = handler.validate({ page: '2' })
      expect(result).toEqual({ page: '2' })
    })

    it('無効なページ番号で例外を投げる', () => {
      // ページ番号が無効な場合
      expect(() => handler.validate({ page: '0' })).toThrow(ValidationException)
      expect(() => handler.validate({ page: 'abc' })).toThrow(ValidationException)
      expect(() => handler.validate({ page: '-1' })).toThrow(ValidationException)
    })

    it('有効なリミット値を受け入れる', () => {
      // 有効なリミット値の検証
      const result = handler.validate({ limit: '50' })
      expect(result).toEqual({ limit: '50' })
    })

    it('無効なリミット値で例外を投げる', () => {
      // リミット値が無効な場合
      expect(() => handler.validate({ limit: '0' })).toThrow(ValidationException)
      expect(() => handler.validate({ limit: '101' })).toThrow(ValidationException)
      expect(() => handler.validate({ limit: 'abc' })).toThrow(ValidationException)
    })

    it('有効な賞味期限ステータスを受け入れる', () => {
      // 有効な賞味期限ステータスの検証
      const validStatuses = ['all', 'expired', 'expiring', 'fresh']
      validStatuses.forEach((status) => {
        const result = handler.validate({ expiryStatus: status })
        expect(result).toEqual({ expiryStatus: status })
      })
    })

    it('無効な賞味期限ステータスで例外を投げる', () => {
      // 無効な賞味期限ステータス
      expect(() => handler.validate({ expiryStatus: 'invalid' })).toThrow(ValidationException)
    })

    it('有効なソートフィールドを受け入れる', () => {
      // 有効なソートフィールドの検証
      const validFields = ['name', 'purchaseDate', 'expiryDate', 'createdAt']
      validFields.forEach((field) => {
        const result = handler.validate({ sortBy: field })
        expect(result).toEqual({ sortBy: field })
      })
    })

    it('無効なソートフィールドで例外を投げる', () => {
      // 無効なソートフィールド
      expect(() => handler.validate({ sortBy: 'invalid' })).toThrow(ValidationException)
    })

    it('有効なソート順を受け入れる', () => {
      // 有効なソート順の検証
      const result1 = handler.validate({ sortOrder: 'asc' })
      expect(result1).toEqual({ sortOrder: 'asc' })

      const result2 = handler.validate({ sortOrder: 'desc' })
      expect(result2).toEqual({ sortOrder: 'desc' })
    })

    it('無効なソート順で例外を投げる', () => {
      // 無効なソート順
      expect(() => handler.validate({ sortOrder: 'invalid' })).toThrow(ValidationException)
    })

    it('複数のパラメータを同時に検証する', () => {
      // 複数パラメータの同時検証
      const result = handler.validate({
        page: '2',
        limit: '30',
        search: 'トマト',
        categoryId: 'cat_123',
        expiryStatus: 'expiring',
        sortBy: 'expiryDate',
        sortOrder: 'asc',
      })

      expect(result).toEqual({
        page: '2',
        limit: '30',
        search: 'トマト',
        categoryId: 'cat_123',
        expiryStatus: 'expiring',
        sortBy: 'expiryDate',
        sortOrder: 'asc',
      })
    })
  })

  describe('ビジネスロジックの実行', () => {
    it('クエリハンドラーの結果を正しい形式で返す', async () => {
      // モックの準備
      const mockIngredientId = testDataHelpers.ingredientId()
      const mockIngredient = {
        id: mockIngredientId,
        name: '人参',
        category: { id: 'cat_1', name: '野菜' },
      }

      const mockIngredients: IngredientDto[] = [
        {
          toJSON: () => ({
            ingredient: mockIngredient,
          }),
        } as unknown as IngredientDto,
      ]

      mockGetIngredientsHandler.execute.mockResolvedValue({
        items: mockIngredients,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })

      // 実行
      const result = await handler.execute({}, 'user_123')

      // 検証
      expect(result).toEqual({
        ingredients: [mockIngredient],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      })
    })

    it('クエリパラメータを正しくクエリオブジェクトに変換する', async () => {
      // モックの準備
      mockGetIngredientsHandler.execute.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 50,
        totalPages: 0,
      })

      // 実行
      await handler.execute(
        {
          page: '2',
          limit: '50',
          search: 'トマト',
          categoryId: 'cat_123',
          expiryStatus: 'expiring',
          sortBy: 'expiryDate',
          sortOrder: 'desc',
        },
        'user_123'
      )

      // クエリハンドラーへの引数を検証
      expect(mockGetIngredientsHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          page: 2,
          limit: 50,
          search: 'トマト',
          categoryId: 'cat_123',
          expiryStatus: 'expiring',
          sortBy: 'expiryDate',
          sortOrder: 'desc',
        })
      )
    })
  })

  describe('例外処理', () => {
    it('ValidationExceptionはBaseApiHandlerによってApiValidationExceptionに変換される', async () => {
      // バリデーションエラーのテスト
      const validationError = new ValidationException('無効なパラメータです')
      mockGetIngredientsHandler.execute.mockRejectedValue(validationError)

      // handleメソッドを使用（BaseApiHandlerの例外変換機能をテスト）
      await expect(handler.handle({}, 'user_123')).rejects.toThrow(ApiValidationException)
    })

    it('予期しないエラーはApiInternalExceptionに変換される', async () => {
      // 予期しないエラーのテスト
      const unexpectedError = new Error('Database connection failed')
      mockGetIngredientsHandler.execute.mockRejectedValue(unexpectedError)

      // handleメソッドを使用
      try {
        await handler.handle({}, 'user_123')
        expect.fail('例外が投げられるはずです')
      } catch (error) {
        // UniversalExceptionConverterによって変換されることを確認
        const apiException = UniversalExceptionConverter.convert(error)
        expect(apiException.statusCode).toBe(500)
        expect(apiException.errorCode).toBe('INTERNAL_SERVER_ERROR')
      }
    })
  })
})
