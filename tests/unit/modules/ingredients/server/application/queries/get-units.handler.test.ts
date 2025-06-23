import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetUnitsQueryHandler } from '@/modules/ingredients/server/application/queries/get-units.handler'
import { GetUnitsQuery } from '@/modules/ingredients/server/application/queries/get-units.query'
import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'

/**
 * GetUnitsQueryHandler のテスト
 *
 * テスト対象:
 * - 単位一覧取得のクエリハンドラー
 * - クエリオブジェクトに基づいた処理の分岐
 * - リポジトリから取得したエンティティをDTOに変換する処理
 * - グルーピング機能の実装
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

  describe('アクティブな単位のみ取得', () => {
    it('デフォルトのクエリでアクティブな単位を取得する', async () => {
      // デフォルトクエリ（includeInactive: false）の処理を確認
      // Arrange
      const mockUnits = [
        new Unit({ id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 }),
        new Unit({ id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockUnits)

      const query = new GetUnitsQuery()

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        units: [
          { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
          { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
        ],
      })
      expect(mockRepository.findAllActive).toHaveBeenCalledOnce()
    })

    it('名前順でソートされた単位を取得する', async () => {
      // sortBy: 'name'の場合のソート処理を確認
      // Arrange
      const mockUnits = [
        new Unit({ id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 2 }),
        new Unit({ id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 1 }),
        new Unit({ id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockUnits)

      const query = new GetUnitsQuery({ sortBy: 'name' })

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        units: [
          { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 1 },
          { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 2 },
          { id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
        ],
      })
    })

    it('記号順でソートされた単位を取得する', async () => {
      // sortBy: 'symbol'の場合のソート処理を確認
      // Arrange
      const mockUnits = [
        new Unit({ id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 }),
        new Unit({ id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 }),
        new Unit({ id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockUnits)

      const query = new GetUnitsQuery({ sortBy: 'symbol' })

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        units: [
          { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
          { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
          { id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
        ],
      })
    })
  })

  describe('タイプ別グルーピング', () => {
    it('タイプ別にグループ化された単位を取得する', async () => {
      // groupByType: trueの場合のグルーピング処理を確認
      // Arrange
      const mockUnits = [
        new Unit({ id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 }),
        new Unit({ id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 }),
        new Unit({ id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 }),
        new Unit({ id: 'unit4', name: 'リットル', symbol: 'L', displayOrder: 4 }),
        new Unit({ id: 'unit5', name: '個', symbol: '個', displayOrder: 5 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockUnits)

      const query = new GetUnitsQuery({ groupByType: true })

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        unitsByType: {
          weight: [
            { id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 },
            { id: 'unit2', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
          ],
          volume: [
            { id: 'unit3', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
            { id: 'unit4', name: 'リットル', symbol: 'L', displayOrder: 4 },
          ],
          count: [{ id: 'unit5', name: '個', symbol: '個', displayOrder: 5 }],
        },
      })
    })

    it('グループ化とソートを組み合わせる', async () => {
      // groupByType: true かつ sortBy: 'name' の場合
      // Arrange
      const mockUnits = [
        new Unit({ id: 'unit1', name: 'キログラム', symbol: 'kg', displayOrder: 2 }),
        new Unit({ id: 'unit2', name: 'グラム', symbol: 'g', displayOrder: 1 }),
        new Unit({ id: 'unit3', name: 'リットル', symbol: 'L', displayOrder: 4 }),
        new Unit({ id: 'unit4', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockUnits)

      const query = new GetUnitsQuery({ groupByType: true, sortBy: 'name' })

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        unitsByType: {
          weight: [
            { id: 'unit1', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
            { id: 'unit2', name: 'グラム', symbol: 'g', displayOrder: 1 },
          ],
          volume: [
            { id: 'unit4', name: 'ミリリットル', symbol: 'ml', displayOrder: 3 },
            { id: 'unit3', name: 'リットル', symbol: 'L', displayOrder: 4 },
          ],
        },
      })
    })

    it('その他カテゴリーの単位も正しくグループ化される', async () => {
      // 分類できない単位が'other'グループに分類されることを確認
      // Arrange
      const mockUnits = [
        new Unit({ id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 }),
        new Unit({ id: 'unit2', name: 'センチメートル', symbol: 'cm', displayOrder: 2 }),
        new Unit({ id: 'unit3', name: 'メートル', symbol: 'm', displayOrder: 3 }),
        new Unit({ id: 'unit4', name: '個', symbol: '個', displayOrder: 4 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockUnits)

      const query = new GetUnitsQuery({ groupByType: true })

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        unitsByType: {
          weight: [{ id: 'unit1', name: 'グラム', symbol: 'g', displayOrder: 1 }],
          count: [{ id: 'unit4', name: '個', symbol: '個', displayOrder: 4 }],
          other: [
            { id: 'unit2', name: 'センチメートル', symbol: 'cm', displayOrder: 2 },
            { id: 'unit3', name: 'メートル', symbol: 'm', displayOrder: 3 },
          ],
        },
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('リポジトリエラーを適切に処理する', async () => {
      // リポジトリでエラーが発生した場合の処理を確認
      // Arrange
      const error = new Error('Database connection failed')
      vi.mocked(mockRepository.findAllActive).mockRejectedValue(error)

      const query = new GetUnitsQuery()

      // Act & Assert
      await expect(handler.handle(query)).rejects.toThrow('Database connection failed')
    })
  })

  describe('空の結果', () => {
    it('単位が存在しない場合、適切な形式で返す', async () => {
      // データが存在しない場合の処理を確認
      // Arrange
      vi.mocked(mockRepository.findAllActive).mockResolvedValue([])

      // Act
      const resultFlat = await handler.handle(new GetUnitsQuery())
      const resultGrouped = await handler.handle(new GetUnitsQuery({ groupByType: true }))

      // Assert
      expect(resultFlat).toEqual({
        units: [],
      })
      expect(resultGrouped).toEqual({
        unitsByType: {},
      })
    })
  })
})
