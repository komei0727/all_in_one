import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetUnitsQueryHandler } from '@/modules/ingredients/server/application/queries/get-units'
import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'

/**
 * GetUnitsQueryHandler のテスト
 *
 * テスト対象:
 * - 単位一覧取得のクエリハンドラー
 * - リポジトリから取得したエンティティをDTOに変換する処理
 * - CQRSパターンにおけるQuery側の実装
 */
describe('GetUnitsQueryHandler', () => {
  let mockRepository: UnitRepository
  let handler: GetUnitsQueryHandler

  beforeEach(() => {
    // リポジトリのモックを作成
    mockRepository = {
      findAllActive: vi.fn(),
      findById: vi.fn(),
    }
    handler = new GetUnitsQueryHandler(mockRepository)
  })

  it('should return active units as DTOs', async () => {
    // アクティブな単位を取得し、DTOとして返すことを確認
    // Arrange
    const mockUnits = [
      new Unit({ id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 }),
      new Unit({ id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 }),
    ]
    vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockUnits)

    // Act
    const result = await handler.execute()

    // Assert
    expect(result).toEqual({
      units: [
        { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
        { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
      ],
    })
    expect(mockRepository.findAllActive).toHaveBeenCalledOnce()
  })

  it('should return empty array when no units exist', async () => {
    // 単位が存在しない場合、空配列を返すことを確認
    // Arrange
    vi.mocked(mockRepository.findAllActive).mockResolvedValue([])

    // Act
    const result = await handler.execute()

    // Assert
    expect(result).toEqual({
      units: [],
    })
  })

  it('should handle repository errors', async () => {
    // リポジトリでエラーが発生した場合の処理を確認
    // Arrange
    const error = new Error('Database connection failed')
    vi.mocked(mockRepository.findAllActive).mockRejectedValue(error)

    // Act & Assert
    await expect(handler.execute()).rejects.toThrow('Database connection failed')
  })
})
