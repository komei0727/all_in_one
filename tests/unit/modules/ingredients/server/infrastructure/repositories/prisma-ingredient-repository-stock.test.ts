import { describe, it, expect, beforeEach, vi } from 'vitest'

import { type PrismaClient } from '@/generated/prisma'
import { IngredientId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'

import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('PrismaIngredientRepository - 在庫管理メソッド', () => {
  let repository: PrismaIngredientRepository

  let mockPrisma: any

  beforeEach(() => {
    // Prismaのモック
    mockPrisma = {
      ingredient: {
        findMany: vi.fn(),
      },
    }
    repository = new PrismaIngredientRepository(mockPrisma as PrismaClient)
  })

  describe('findOutOfStock', () => {
    it('在庫切れ（quantity: 0）の食材を取得できる', async () => {
      const userId = testDataHelpers.userId()
      const categoryId = testDataHelpers.categoryId()
      const unitId = testDataHelpers.unitId()

      // 在庫切れの食材
      const outOfStockIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '在庫切れトマト',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 0, // 在庫切れ
        unitId,
        threshold: 5,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([outOfStockIngredient])

      // 実行
      const result = await repository.findOutOfStock(userId)

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          quantity: 0,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      // 結果の確認
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('在庫切れトマト')
      expect(result[0].getIngredientStock().getQuantity()).toBe(0)
    })

    it('在庫がある食材は取得されない', async () => {
      const userId = testDataHelpers.userId()

      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行
      const result = await repository.findOutOfStock(userId)

      // 結果の確認：在庫がある食材は含まれない
      expect(result).toHaveLength(0)
    })
  })

  describe('findLowStock', () => {
    it('指定した閾値以下の在庫を取得できる（在庫切れを除く）', async () => {
      const userId = testDataHelpers.userId()
      const categoryId = testDataHelpers.categoryId()
      const unitId = testDataHelpers.unitId()
      const threshold = 5

      // 在庫不足の食材（在庫3、閾値5以下）
      const lowStockIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '在庫不足のキャベツ',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 3, // 在庫不足
        unitId,
        threshold: 10, // 個別の閾値（テストでは使用しない）
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([lowStockIngredient])

      // 実行（閾値を指定）
      const result = await repository.findLowStock(userId, threshold)

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          quantity: {
            lte: threshold,
            gt: 0, // 在庫切れは除外
          },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      // 結果の確認
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('在庫不足のキャベツ')
      expect(result[0].getIngredientStock().getQuantity()).toBe(3)
    })

    it('各食材の個別閾値を使用して在庫不足を判定できる', async () => {
      const userId = testDataHelpers.userId()
      const categoryId = testDataHelpers.categoryId()
      const unitId = testDataHelpers.unitId()

      // 在庫不足の食材（在庫3、個別閾値5）
      const lowStockIngredient1 = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '閾値5で在庫3の人参',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 3,
        unitId,
        threshold: 5, // 個別閾値
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      // 在庫十分な食材（在庫8、個別閾値5）
      const sufficientStockIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '閾値5で在庫8のじゃがいも',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 8,
        unitId,
        threshold: 5, // 個別閾値
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      // 在庫切れの食材（フィルタリングで除外される）
      const outOfStockIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '在庫切れの玉ねぎ',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 0,
        unitId,
        threshold: 5,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([
        lowStockIngredient1,
        sufficientStockIngredient,
        outOfStockIngredient,
      ])

      // 実行（閾値を指定しない）
      const result = await repository.findLowStock(userId)

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
          threshold: {
            not: null,
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // 結果の確認：在庫不足の食材のみ
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('閾値5で在庫3の人参')
    })

    it('閾値が設定されていない食材は取得されない', async () => {
      const userId = testDataHelpers.userId()
      const categoryId = testDataHelpers.categoryId()
      const unitId = testDataHelpers.unitId()

      // 閾値なしの食材
      const noThresholdIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '閾値なしの食材',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 1,
        unitId,
        threshold: null, // 閾値なし
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([noThresholdIngredient])

      // 実行（閾値を指定しない）
      const result = await repository.findLowStock(userId)

      // 結果の確認：閾値なしの食材はフィルタリングされる
      expect(result).toHaveLength(0)
    })
  })
})
