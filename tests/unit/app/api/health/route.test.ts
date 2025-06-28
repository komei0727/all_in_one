import { NextRequest } from 'next/server'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GET } from '@/app/api/health/route'
import { prisma } from '@/lib/prisma'

// prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

// package.jsonのモック
vi.mock('../../../../../package.json', () => ({
  version: '1.2.3',
}))

/**
 * GET /api/health のテスト
 *
 * テスト対象:
 * - ヘルスチェックレスポンスの形式
 * - データベース接続状態の確認
 * - エラーハンドリング
 * - 認証不要でのアクセス
 */
describe('GET /api/health', () => {
  const mockRequest = new NextRequest('http://localhost:3000/api/health')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // console.errorのモック
    vi.spyOn(console, 'error').mockImplementation(() => {
      // 空の実装
    })
  })

  it('正常時はstatus: okとデータベース接続状態を返す', async () => {
    // データベース接続が成功する場合のテスト
    // Arrange
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ '?column?': 1 }])
    ;(prisma.$queryRaw as any) = mockQueryRaw

    // Act
    const response = await GET(mockRequest)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      status: 'ok',
      service: 'all-in-one-api',
      version: '1.2.3',
      database: 'connected',
    })
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(mockQueryRaw).toHaveBeenCalledWith(['SELECT 1'])
  })

  it('データベース接続エラー時はdatabase: errorを返す', async () => {
    // データベース接続が失敗する場合でもAPIは正常レスポンスを返す
    // Arrange
    const mockQueryRaw = vi.fn().mockRejectedValueOnce(new Error('Connection failed'))
    ;(prisma.$queryRaw as any) = mockQueryRaw

    // Act
    const response = await GET(mockRequest)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      status: 'ok',
      service: 'all-in-one-api',
      version: '1.2.3',
      database: 'error',
    })
  })

  it('認証なしでアクセス可能である', async () => {
    // 認証ヘッダーなしでもアクセスできることを確認
    // Arrange
    const mockQueryRaw = vi.fn().mockResolvedValueOnce([{ '?column?': 1 }])
    ;(prisma.$queryRaw as any) = mockQueryRaw
    const unauthenticatedRequest = new NextRequest('http://localhost:3000/api/health')

    // Act
    const response = await GET(unauthenticatedRequest)

    // Assert
    expect(response.status).toBe(200)
    // 認証チェック関数が呼ばれないことを暗黙的に確認（モックしていないため）
  })
})

describe('GET /api/health - エラーハンドリング', () => {
  const mockRequest = new NextRequest('http://localhost:3000/api/health')

  beforeEach(() => {
    vi.clearAllMocks()
    // console.errorのモック
    vi.spyOn(console, 'error').mockImplementation(() => {
      // 空の実装
    })
  })

  it('予期しないエラー時は500エラーを返す', async () => {
    // ヘルスチェック処理自体でエラーが発生した場合
    // Arrange
    const mockQueryRaw = vi.fn().mockRejectedValueOnce(new Error('Database error'))
    ;(prisma.$queryRaw as any) = mockQueryRaw

    // package.jsonのインポートでエラーを発生させる
    vi.doMock('../../../../../package.json', () => {
      throw new Error('Unexpected error')
    })

    // Act
    const response = await GET(mockRequest)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(data).toMatchObject({
      status: 'error',
      service: 'all-in-one-api',
      error: 'Internal server error',
    })
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(console.error).toHaveBeenCalledWith('Health check error:', expect.any(Error))
  })
})
