import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/categories/route'
import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories'

// モジュールのモック
vi.mock('@/modules/ingredients/server/application/queries/get-categories', () => ({
  GetCategoriesQueryHandler: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}))

vi.mock(
  '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository',
  () => ({
    PrismaCategoryRepository: vi.fn(),
  })
)

vi.mock('@/lib/prisma/client', () => ({
  prisma: {},
}))

/**
 * GET /api/v1/ingredients/categories のテスト
 *
 * テスト対象:
 * - Next.js App RouterのRoute Handler実装
 * - 4層アーキテクチャの統合（API層がApplication層を呼び出す）
 * - HTTPレスポンスの形式
 */
describe('GET /api/v1/ingredients/categories', () => {
  let mockQueryHandler: { execute: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHandler = {
      execute: vi.fn(),
    }
    vi.mocked(GetCategoriesQueryHandler).mockImplementation(
      () => mockQueryHandler as unknown as GetCategoriesQueryHandler
    )
  })

  it('should return categories from query handler', async () => {
    // クエリハンドラーの結果をHTTPレスポンスとして返すことを確認
    // Arrange
    const mockResult = {
      categories: [
        { id: 'cat1', name: '野菜', displayOrder: 1 },
        { id: 'cat2', name: '肉類', displayOrder: 2 },
      ],
    }
    mockQueryHandler.execute.mockResolvedValue(mockResult)

    // Act
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/categories')
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      categories: [
        { id: 'cat1', name: '野菜', displayOrder: 1 },
        { id: 'cat2', name: '肉類', displayOrder: 2 },
      ],
    })
    expect(mockQueryHandler.execute).toHaveBeenCalledOnce()
  })

  it('should handle errors gracefully', async () => {
    // エラーが発生した場合、適切なHTTPエラーレスポンスを返すことを確認
    // Arrange
    mockQueryHandler.execute.mockRejectedValue(new Error('Database error'))

    // Act
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/categories')
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    })
  })
})
