import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetCategoriesHandler } from '@/modules/ingredients/server/api/handlers/categories/get-categories.handler'
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
    const mockResult = {
      categories: [
        { id: 'cat1', name: '野菜', displayOrder: 1 },
        { id: 'cat2', name: '肉類', displayOrder: 2 },
      ],
    }
    mockQueryHandler.execute.mockResolvedValue(mockResult)

    // Act
    const result = await handler.handle()

    // Assert
    expect(result).toEqual(mockResult)
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
