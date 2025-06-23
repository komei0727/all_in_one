import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetUnitsHandler } from '@/modules/ingredients/server/api/handlers/queries/get-units.handler'
import { UnitListDTO } from '@/modules/ingredients/server/application/dtos/unit-list.dto'
import { UnitDTO } from '@/modules/ingredients/server/application/dtos/unit.dto'
import { GetUnitsQueryHandler } from '@/modules/ingredients/server/application/queries/get-units.handler'

// モジュールのモック
vi.mock('@/modules/ingredients/server/application/queries/get-units.handler')
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
  let mockQueryHandler: { handle: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHandler = {
      handle: vi.fn(),
    }
    vi.mocked(GetUnitsQueryHandler).mockImplementation(
      () => mockQueryHandler as unknown as GetUnitsQueryHandler
    )
    handler = new GetUnitsHandler()
  })

  it('should return units from query handler', async () => {
    // クエリハンドラーの結果を返すことを確認
    // Arrange
    const unitDTOs = [
      new UnitDTO('unit1', 'グラム', 'g', 1),
      new UnitDTO('unit2', 'キログラム', 'kg', 2),
    ]
    const mockDTO = new UnitListDTO(unitDTOs)
    mockQueryHandler.handle.mockResolvedValue(mockDTO)

    // Act
    const result = await handler.handle()

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
    await expect(handler.handle()).rejects.toThrow('Database error')
  })

  it('should return unitsByType directly when groupByType is true', async () => {
    // groupByTypeがtrueの場合、unitsByTypeを直接返すことを確認
    // Arrange
    const mockResult = {
      unitsByType: {
        weight: [
          { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
          { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
        ],
        volume: [{ id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 }],
      },
    }
    mockQueryHandler.handle.mockResolvedValue(mockResult)

    // Act
    const result = await handler.handle({ groupByType: true })

    // Assert
    expect(result).toEqual(mockResult)
    expect(mockQueryHandler.handle).toHaveBeenCalledOnce()
  })
})
