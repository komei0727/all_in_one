import { NextRequest } from 'next/server'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/units/route'
import { GetUnitsHandler } from '@/modules/ingredients/server/api/handlers/queries/get-units.handler'

import { testDataHelpers } from '../../../../../__fixtures__/builders/faker.config'

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
  let unitId1: string
  let unitId2: string
  let unitId3: string

  beforeEach(() => {
    vi.clearAllMocks()
    mockHandler = {
      handle: vi.fn(),
    }
    vi.mocked(GetUnitsHandler).mockImplementation(() => mockHandler as unknown as GetUnitsHandler)
    // テスト用のIDを生成
    unitId1 = testDataHelpers.unitId()
    unitId2 = testDataHelpers.unitId()
    unitId3 = testDataHelpers.unitId()
  })

  it('ハンドラーから単位一覧を取得して返す', async () => {
    // ハンドラーの結果をHTTPレスポンスとして返すことを確認
    // Arrange
    const mockResult = {
      units: [
        { id: unitId1, name: '個', symbol: '個', displayOrder: 1 },
        { id: unitId2, name: 'グラム', symbol: 'g', displayOrder: 2 },
        { id: unitId3, name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
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
        { id: unitId1, name: '個', symbol: '個', displayOrder: 1 },
        { id: unitId2, name: 'グラム', symbol: 'g', displayOrder: 2 },
        { id: unitId3, name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
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
