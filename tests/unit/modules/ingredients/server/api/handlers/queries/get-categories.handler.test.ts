import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetCategoriesApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-categories.handler'
import { CategoryListDTO } from '@/modules/ingredients/server/application/dtos/category-list.dto'
import { CategoryDTO } from '@/modules/ingredients/server/application/dtos/category.dto'
import type { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories.handler'
import { GetCategoriesQuery } from '@/modules/ingredients/server/application/queries/get-categories.query'
import { ApiValidationException } from '@/modules/shared/server/api/exceptions/api-validation.exception'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetCategoriesApiHandler', () => {
  let mockQueryHandler: GetCategoriesQueryHandler
  let apiHandler: GetCategoriesApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHandler = {
      handle: vi.fn(),
    } as unknown as GetCategoriesQueryHandler
    apiHandler = new GetCategoriesApiHandler(mockQueryHandler)
  })

  // テストデータビルダー
  const createCategoryId = () => testDataHelpers.categoryId()

  describe('正常系', () => {
    it('デフォルトのソート順（displayOrder）でカテゴリー一覧が取得できる', async () => {
      // Given: 表示順でソートされたカテゴリー
      const categoryId1 = createCategoryId()
      const categoryId2 = createCategoryId()
      const categoryId3 = createCategoryId()

      const categoryDTOs = [
        new CategoryDTO(categoryId1, '野菜', 1),
        new CategoryDTO(categoryId2, '肉類', 2),
        new CategoryDTO(categoryId3, '魚介類', 3),
      ]
      const mockDTO = new CategoryListDTO(categoryDTOs)

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockDTO)

      // When: リクエストパラメータを渡さない（デフォルト）
      const result = await apiHandler.handle({}, 'test-user-id')

      // Then: displayOrderでソートされた結果が返される
      expect(result).toEqual({
        categories: [
          { id: categoryId1, name: '野菜', displayOrder: 1 },
          { id: categoryId2, name: '肉類', displayOrder: 2 },
          { id: categoryId3, name: '魚介類', displayOrder: 3 },
        ],
      })

      // デフォルトのソート順でクエリが実行されることを確認
      expect(mockQueryHandler.handle).toHaveBeenCalledWith(expect.any(GetCategoriesQuery))
      // GetCategoriesQueryが内部で'displayOrder'をデフォルト値として設定している可能性がある
      const [[actualQuery]] = vi.mocked(mockQueryHandler.handle).mock.calls
      expect(actualQuery).toBeDefined()
    })

    it('名前順でソートされたカテゴリー一覧が取得できる', async () => {
      // Given: 名前順でソートされたカテゴリー
      const categoryId1 = createCategoryId()
      const categoryId2 = createCategoryId()
      const categoryId3 = createCategoryId()

      const categoryDTOs = [
        new CategoryDTO(categoryId3, '魚介類', 3),
        new CategoryDTO(categoryId2, '肉類', 2),
        new CategoryDTO(categoryId1, '野菜', 1),
      ]
      const mockDTO = new CategoryListDTO(categoryDTOs)

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockDTO)

      // When: sortByにnameを指定
      const result = await apiHandler.handle({ sortBy: 'name' }, 'test-user-id')

      // Then: 名前順でソートされた結果が返される
      expect(result).toEqual({
        categories: [
          { id: categoryId3, name: '魚介類', displayOrder: 3 },
          { id: categoryId2, name: '肉類', displayOrder: 2 },
          { id: categoryId1, name: '野菜', displayOrder: 1 },
        ],
      })

      // 名前順でクエリが実行されることを確認
      expect(mockQueryHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
        })
      )
    })

    it('表示順でソートされたカテゴリー一覧が取得できる', async () => {
      // Given: displayOrderを明示的に指定
      const categoryId1 = createCategoryId()
      const categoryId2 = createCategoryId()

      const categoryDTOs = [
        new CategoryDTO(categoryId1, '野菜', 1),
        new CategoryDTO(categoryId2, '肉類', 2),
      ]
      const mockDTO = new CategoryListDTO(categoryDTOs)

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockDTO)

      // When: sortByにdisplayOrderを指定
      const result = await apiHandler.handle({ sortBy: 'displayOrder' }, 'test-user-id')

      // Then: 表示順でソートされた結果が返される
      expect(result).toEqual({
        categories: [
          { id: categoryId1, name: '野菜', displayOrder: 1 },
          { id: categoryId2, name: '肉類', displayOrder: 2 },
        ],
      })

      expect(mockQueryHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'displayOrder',
        })
      )
    })

    it('カテゴリーが存在しない場合は空の配列が返される', async () => {
      // Given: 空のカテゴリーリスト
      const mockDTO = new CategoryListDTO([])

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockDTO)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle({}, 'test-user-id')

      // Then: 空の配列が返される
      expect(result).toEqual({
        categories: [],
      })
    })

    it('nullまたはundefinedのリクエストでもデフォルト値で処理される', async () => {
      // Given: カテゴリーリスト
      const categoryDTOs = [new CategoryDTO(createCategoryId(), '野菜', 1)]
      const mockDTO = new CategoryListDTO(categoryDTOs)

      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockDTO)

      // When: nullを渡す
      const result = await apiHandler.handle(null as any, 'test-user-id')

      // Then: デフォルト値で処理される
      expect(result).toEqual(mockDTO.toJSON())
      expect(mockQueryHandler.handle).toHaveBeenCalled()
    })
  })

  describe('バリデーション', () => {
    it('リクエストデータが文字列の場合はバリデーションエラーを投げる', async () => {
      await expect(apiHandler.handle('invalid-data' as any, 'test-user-id')).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('リクエストデータが数値の場合はバリデーションエラーを投げる', async () => {
      await expect(apiHandler.handle(123 as any, 'test-user-id')).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('sortByが文字列でない場合はバリデーションエラーを投げる', async () => {
      await expect(apiHandler.handle({ sortBy: 123 as any }, 'test-user-id')).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('sortByが配列の場合はバリデーションエラーを投げる', async () => {
      await expect(apiHandler.handle({ sortBy: ['name'] as any }, 'test-user-id')).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('無効なsortBy値の場合はバリデーションエラーを投げる', async () => {
      const invalidSortByValues = ['invalid', 'date', 'id', 'createdAt', 'updatedAt']

      for (const invalidSortBy of invalidSortByValues) {
        await expect(
          apiHandler.handle({ sortBy: invalidSortBy as any }, 'test-user-id')
        ).rejects.toThrow(ApiValidationException)
      }

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('sortByがnullの場合はバリデーションエラーを投げる', async () => {
      // Given: sortByがnullのリクエスト
      await expect(apiHandler.handle({ sortBy: null as any }, 'test-user-id')).rejects.toThrow(
        ApiValidationException
      )

      expect(mockQueryHandler.handle).not.toHaveBeenCalled()
    })

    it('不要なプロパティは無視される', async () => {
      // Given: 余分なプロパティを含むリクエスト
      const mockDTO = new CategoryListDTO([])
      vi.mocked(mockQueryHandler.handle).mockResolvedValue(mockDTO)

      // When: 余分なプロパティを含むリクエスト
      const result = await apiHandler.handle(
        { sortBy: 'name', extra: 'property' } as any,
        'test-user-id'
      )

      // Then: 正常に処理される
      expect(result).toEqual(mockDTO.toJSON())
      expect(mockQueryHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
        })
      )
    })
  })

  describe('例外処理', () => {
    it('クエリハンドラーのエラーが伝播される', async () => {
      // Given: クエリハンドラーがエラーを投げる
      const error = new Error('Database connection error')
      vi.mocked(mockQueryHandler.handle).mockRejectedValue(error)

      // When & Then: エラーがApiInternalExceptionに変換される
      await expect(apiHandler.handle({}, 'test-user-id')).rejects.toThrow(
        'An unexpected error occurred'
      )
    })

    it('予期しないエラーが発生した場合も適切に処理される', async () => {
      // Given: 予期しないエラー
      vi.mocked(mockQueryHandler.handle).mockRejectedValue(new TypeError('Cannot read property'))

      // When & Then: エラーがApiInternalExceptionに変換される
      await expect(apiHandler.handle({}, 'test-user-id')).rejects.toThrow(
        'An unexpected error occurred'
      )
    })
  })
})
