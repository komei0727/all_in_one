import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetUnitsHandler } from '@/modules/ingredients/server/api/handlers/units/get-units.handler'
import { GetUnitsQueryHandler } from '@/modules/ingredients/server/application/queries/get-units'

// モジュールのモック
vi.mock('@/modules/ingredients/server/application/queries/get-units')
vi.mock('@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository')
vi.mock('@/lib/prisma/client', () => ({
  prisma: {},
}))

/**
 * GetUnitsHandler のテスト
 *
 * テスト対象:
 * - API層のハンドラー実装
 * - Application層への委譲処理
 * - エラーハンドリング
 */
describe('GetUnitsHandler', () => {
  let handler: GetUnitsHandler
  let mockQueryHandler: { execute: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHandler = {
      execute: vi.fn(),
    }
    vi.mocked(GetUnitsQueryHandler).mockImplementation(
      () => mockQueryHandler as unknown as GetUnitsQueryHandler
    )
    handler = new GetUnitsHandler()
  })

  it('should return units from query handler', async () => {
    // クエリハンドラーの結果を返すことを確認
    // Arrange
    const mockResult = {
      units: [
        { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
        { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
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
