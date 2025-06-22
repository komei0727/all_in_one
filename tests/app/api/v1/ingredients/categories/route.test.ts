import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/categories/route'
import { GetCategoriesHandler } from '@/modules/ingredients/server/api/handlers/queries/get-categories.handler'

// モジュールのモック
vi.mock('@/modules/ingredients/server/api/handlers/queries/get-categories.handler', () => ({
  GetCategoriesHandler: vi.fn().mockImplementation(() => ({
    handle: vi.fn(),
  })),
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
  let mockHandler: { handle: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockHandler = {
      handle: vi.fn(),
    }
    vi.mocked(GetCategoriesHandler).mockImplementation(
      () => mockHandler as unknown as GetCategoriesHandler
    )
  })

  it('should return categories from handler', async () => {
    // ハンドラーの結果をHTTPレスポンスとして返すことを確認
    // Arrange
    const mockResult = {
      categories: [
        { id: 'cat1', name: '野菜', displayOrder: 1 },
        { id: 'cat2', name: '肉類', displayOrder: 2 },
      ],
    }
    mockHandler.handle.mockResolvedValue(mockResult)

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
    expect(mockHandler.handle).toHaveBeenCalledOnce()
  })

  it('should handle errors gracefully', async () => {
    // エラーが発生した場合、適切なHTTPエラーレスポンスを返すことを確認
    // Arrange
    mockHandler.handle.mockRejectedValue(new Error('Database error'))

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
