import { describe, it, expect, vi, beforeEach } from 'vitest'

import { type PrismaClient, type UnitType } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import { UnitId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

// Prismaクライアントのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    unit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

/**
 * PrismaUnitRepository のテスト
 *
 * テスト対象:
 * - Prismaを使用した単位リポジトリの実装
 * - データベースからのデータ取得とエンティティへの変換
 * - 依存性逆転の原則に基づくリポジトリ実装
 */
describe('PrismaUnitRepository', () => {
  let repository: PrismaUnitRepository
  let unitId1: string
  let unitId2: string

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new PrismaUnitRepository(prisma as unknown as PrismaClient)
    // テスト用のIDを生成
    unitId1 = testDataHelpers.unitId()
    unitId2 = testDataHelpers.unitId()
  })

  describe('findAllActive', () => {
    it('should return active units as entities', async () => {
      // アクティブな単位をデータベースから取得し、エンティティに変換することを確認
      // Arrange
      const mockDbUnits = [
        {
          id: unitId1,
          name: 'グラム',
          symbol: 'g',
          type: 'WEIGHT' as UnitType,
          displayOrder: 1,
          isActive: true,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: unitId2,
          name: 'キログラム',
          symbol: 'kg',
          type: 'WEIGHT' as UnitType,
          displayOrder: 2,
          isActive: true,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(prisma.unit.findMany).mockResolvedValue(mockDbUnits)

      // Act
      const result = await repository.findAllActive()

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(Unit)
      expect(result[0].id.getValue()).toBe(unitId1)
      expect(result[0].name.getValue()).toBe('グラム')
      expect(result[0].symbol.getValue()).toBe('g')
      expect(result[0].displayOrder.getValue()).toBe(1)

      expect(result[1]).toBeInstanceOf(Unit)
      expect(result[1].id.getValue()).toBe(unitId2)
      expect(result[1].name.getValue()).toBe('キログラム')
      expect(result[1].symbol.getValue()).toBe('kg')
      expect(result[1].displayOrder.getValue()).toBe(2)

      // Prismaクエリの確認
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      })
    })

    it('should return empty array when no active units exist', async () => {
      // アクティブな単位が存在しない場合、空配列を返すことを確認
      // Arrange
      vi.mocked(prisma.unit.findMany).mockResolvedValue([])

      // Act
      const result = await repository.findAllActive()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findById', () => {
    it('should return unit entity when found', async () => {
      // IDで単位を検索し、見つかった場合はエンティティを返すことを確認
      // Arrange
      const mockDbUnit = {
        id: unitId1,
        name: 'グラム',
        symbol: 'g',
        type: 'WEIGHT' as UnitType,
        displayOrder: 1,
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(prisma.unit.findUnique).mockResolvedValue(mockDbUnit)

      // Act
      const result = await repository.findById(new UnitId(unitId1))

      // Assert
      expect(result).toBeInstanceOf(Unit)
      expect(result?.id.getValue()).toBe(unitId1)
      expect(result?.name.getValue()).toBe('グラム')
      expect(result?.symbol.getValue()).toBe('g')
      expect(result?.displayOrder.getValue()).toBe(1)

      expect(prisma.unit.findUnique).toHaveBeenCalledWith({
        where: { id: unitId1 },
      })
    })

    it('should return null when unit not found', async () => {
      // 単位が見つからない場合、nullを返すことを確認
      // Arrange
      vi.mocked(prisma.unit.findUnique).mockResolvedValue(null)

      // Act
      const result = await repository.findById(new UnitId(testDataHelpers.unitId()))

      // Assert
      expect(result).toBeNull()
    })
  })
})
