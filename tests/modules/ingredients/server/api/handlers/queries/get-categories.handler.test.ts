import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetCategoriesHandler } from '@/modules/ingredients/server/api/handlers/queries/get-categories.handler'
import { CategoryListDTO } from '@/modules/ingredients/server/application/dtos/category/category-list.dto'
import { CategoryDTO } from '@/modules/ingredients/server/application/dtos/category/category.dto'
import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories'

// モジュールのモック
vi.mock('@/modules/ingredients/server/application/queries/get-categories')
vi.mock('@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository')
vi.mock('@/lib/prisma/client', () => ({
  prisma: {},
}))

/**
 * GetCategoriesHandler のテスト
 *
 * テスト対象:
 * - API層のハンドラー実装
 * - Application層への委譲処理
 * - エラーハンドリング
 */
describe('GetCategoriesHandler', () => {
  let handler: GetCategoriesHandler
  let mockQueryHandler: { execute: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHandler = {
      execute: vi.fn(),
    }
    vi.mocked(GetCategoriesQueryHandler).mockImplementation(
      () => mockQueryHandler as unknown as GetCategoriesQueryHandler
    )
    handler = new GetCategoriesHandler()
  })

  it('should return categories from query handler', async () => {
    // クエリハンドラーの結果を返すことを確認
    // Arrange
    const categoryDTOs = [new CategoryDTO('cat1', '野菜', 1), new CategoryDTO('cat2', '肉類', 2)]
    const mockDTO = new CategoryListDTO(categoryDTOs)
    mockQueryHandler.execute.mockResolvedValue(mockDTO)

    // Act
    const result = await handler.handle()

    // Assert
    expect(result).toEqual(mockDTO.toJSON())
    expect(mockQueryHandler.execute).toHaveBeenCalledOnce()
  })

  it('should propagate errors from query handler', async () => {
    // クエリハンドラーのエラーが伝播することを確認
    // Arrange
    const error = new Error('Database error')
    mockQueryHandler.execute.mockRejectedValue(error)

    // Act & Assert
    await expect(handler.handle()).rejects.toThrow('Database error')
  })
})
