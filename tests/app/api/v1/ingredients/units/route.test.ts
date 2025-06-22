import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/units/route'
import { GetUnitsHandler } from '@/modules/ingredients/server/api/handlers/units/get-units.handler'

// モジュールのモック
vi.mock('@/modules/ingredients/server/api/handlers/units/get-units.handler', () => ({
  GetUnitsHandler: vi.fn().mockImplementation(() => ({
    handle: vi.fn(),
  })),
}))

/**
 * GET /api/v1/ingredients/units のテスト
 *
 * テスト対象:
 * - Next.js App RouterのRoute Handler実装
 * - 4層アーキテクチャの統合（API層がApplication層を呼び出す）
 * - HTTPレスポンスの形式
 */
describe('GET /api/v1/ingredients/units', () => {
  let mockHandler: { handle: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockHandler = {
      handle: vi.fn(),
    }
    vi.mocked(GetUnitsHandler).mockImplementation(() => mockHandler as unknown as GetUnitsHandler)
  })

  it('should return units from handler', async () => {
    // ハンドラーの結果をHTTPレスポンスとして返すことを確認
    // Arrange
    const mockResult = {
      units: [
        { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
        { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
      ],
    }
    mockHandler.handle.mockResolvedValue(mockResult)

    // Act
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/units')
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      units: [
        { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
        { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
      ],
    })
    expect(mockHandler.handle).toHaveBeenCalledOnce()
  })

  it('should handle errors gracefully', async () => {
    // エラーが発生した場合、適切なHTTPエラーレスポンスを返すことを確認
    // Arrange
    mockHandler.handle.mockRejectedValue(new Error('Database error'))

    // Act
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/units')
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
