import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/units/route'
import { GetUnitsHandler } from '@/modules/ingredients/server/api/handlers/queries/get-units.handler'

// モジュールのモック
vi.mock('@/modules/ingredients/server/api/handlers/queries/get-units.handler', () => ({
  GetUnitsHandler: vi.fn().mockImplementation(() => ({
    handle: vi.fn(),
  })),
}))

/**
 * GET /api/v1/ingredients/units のテスト
 *
 * テスト対象:
 * - Next.js App RouterのRoute Handler実装
 * - ハンドラーへの処理委譲
 * - HTTPレスポンスの形式
 * - エラーハンドリング
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

  it('ハンドラーから単位一覧を取得して返す', async () => {
    // ハンドラーの結果をHTTPレスポンスとして返すことを確認
    // Arrange
    const mockResult = {
      units: [
        { id: 'unit1', name: '個', symbol: '個', displayOrder: 1 },
        { id: 'unit2', name: 'グラム', symbol: 'g', displayOrder: 2 },
        { id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
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
        { id: 'unit1', name: '個', symbol: '個', displayOrder: 1 },
        { id: 'unit2', name: 'グラム', symbol: 'g', displayOrder: 2 },
        { id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
      ],
    })
    expect(mockHandler.handle).toHaveBeenCalledOnce()
  })

  it('空の単位配列を正常に返す', async () => {
    // 空の配列でも正常なレスポンスとして扱うことを確認
    // Arrange
    const mockResult = { units: [] }
    mockHandler.handle.mockResolvedValue(mockResult)

    // Act
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/units')
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ units: [] })
  })

  it('ハンドラーがエラーをスローした場合、500エラーを返す', async () => {
    // エラーが発生した場合、適切なHTTPエラーレスポンスを返すことを確認
    // Arrange
    mockHandler.handle.mockRejectedValue(new Error('Database connection failed'))

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
