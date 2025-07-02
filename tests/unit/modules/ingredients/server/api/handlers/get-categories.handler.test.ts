import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetCategoriesApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-categories.handler'
import { CategoryListDTO } from '@/modules/ingredients/server/application/dtos/category-list.dto'
import { CategoryDTO } from '@/modules/ingredients/server/application/dtos/category.dto'
import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories.handler'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

// モジュールのモック
vi.mock('@/modules/ingredients/server/application/queries/get-categories.handler')
vi.mock('@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository')
vi.mock('@/lib/prisma/client', () => ({
  prisma: {},
}))

/**
 * GetCategoriesApiHandler のテスト
 *
 * テスト対象:
 * - API層のハンドラー実装
 * - Application層への委譲処理
 * - エラーハンドリング
 */
describe('GetCategoriesApiHandler', () => {
  let handler: GetCategoriesApiHandler
  let mockQueryHandler: { handle: ReturnType<typeof vi.fn> }
  let categoryId1: string
  let categoryId2: string

  beforeEach(() => {
    // テスト用IDの生成
    categoryId1 = testDataHelpers.categoryId()
    categoryId2 = testDataHelpers.categoryId()
    vi.clearAllMocks()
    mockQueryHandler = {
      handle: vi.fn(),
    }
    vi.mocked(GetCategoriesQueryHandler).mockImplementation(
      () => mockQueryHandler as unknown as GetCategoriesQueryHandler
    )
    handler = new GetCategoriesApiHandler(mockQueryHandler as unknown as GetCategoriesQueryHandler)
  })

  it('should return categories from query handler', async () => {
    // クエリハンドラーの結果を返すことを確認
    // Arrange
    const categoryDTOs = [
      new CategoryDTO(categoryId1, '野菜', 1),
      new CategoryDTO(categoryId2, '肉類', 2),
    ]
    const mockDTO = new CategoryListDTO(categoryDTOs)
    mockQueryHandler.handle.mockResolvedValue(mockDTO)

    // Act
    const result = await handler.handle({}, 'test-user-id')

    // Assert
    expect(result).toEqual(mockDTO.toJSON())
    expect(mockQueryHandler.handle).toHaveBeenCalledOnce()
  })

  it('should propagate errors from query handler', async () => {
    // クエリハンドラーのエラーが伝播することを確認
    // Arrange
    const error = new Error('Database error')
    mockQueryHandler.handle.mockRejectedValue(error)

    // Act & Assert
    await expect(handler.handle({}, 'test-user-id')).rejects.toThrow()
  })
})
