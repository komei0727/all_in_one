import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@/generated/prisma'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { IngredientId, StorageType } from '@/modules/ingredients/server/domain/value-objects'

describe('PrismaIngredientRepository - 分類・保存場所検索メソッド', () => {
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

  describe('findByCategory', () => {
    it('指定したカテゴリーの食材を取得できる', async () => {
      const userId = 'user-123'
      const categoryId = 'cat-vegetable'

      // 野菜カテゴリーの食材
      const vegetableIngredient1 = {
        id: IngredientId.generate().getValue(),
        userId,
        name: 'トマト',
        categoryId: categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 3,
        unitId: 'unit1',
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      const vegetableIngredient2 = {
        id: IngredientId.generate().getValue(),
        userId,
        name: 'キャベツ',
        categoryId: categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 1,
        unitId: 'unit1',
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(Date.now() - 1000), // 作成日時が古い
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([vegetableIngredient1, vegetableIngredient2])

      // 実行
      const result = await repository.findByCategory(userId, categoryId)

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          categoryId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      // 結果の確認
      expect(result).toHaveLength(2)
      expect(result[0].getName().getValue()).toBe('トマト') // より新しい
      expect(result[1].getName().getValue()).toBe('キャベツ')
    })

    it('他のカテゴリーの食材は取得されない', async () => {
      const userId = 'user-123'
      const categoryId = 'cat-meat'

      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行
      const result = await repository.findByCategory(userId, categoryId)

      // 結果の確認
      expect(result).toHaveLength(0)
    })
  })

  describe('findByStorageLocation', () => {
    it('冷蔵保存の食材を取得できる', async () => {
      const userId = 'user-123'
      const location = StorageType.REFRIGERATED

      // 冷蔵保存の食材
      const refrigeratedIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '牛乳',
        categoryId: 'cat1',
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 1,
        unitId: 'unit1',
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: 'ドアポケット',
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([refrigeratedIngredient])

      // 実行
      const result = await repository.findByStorageLocation(userId, location)

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          storageLocationType: 'REFRIGERATED',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      // 結果の確認
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('牛乳')
      expect(result[0].getIngredientStock().getStorageLocation().getType()).toBe(
        StorageType.REFRIGERATED
      )
    })

    it('冷凍保存の食材を取得できる', async () => {
      const userId = 'user-123'
      const location = StorageType.FROZEN

      // 冷凍保存の食材
      const frozenIngredient1 = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '冷凍ほうれん草',
        categoryId: 'cat1',
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 2,
        unitId: 'unit1',
        threshold: null,
        storageLocationType: 'FROZEN',
        storageLocationDetail: null,
        bestBeforeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90日後
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      const frozenIngredient2 = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '冷凍餃子',
        categoryId: 'cat1',
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 1,
        unitId: 'unit1',
        threshold: null,
        storageLocationType: 'FROZEN',
        storageLocationDetail: '上段',
        bestBeforeDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60日後
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([frozenIngredient1, frozenIngredient2])

      // 実行
      const result = await repository.findByStorageLocation(userId, location)

      // 結果の確認
      expect(result).toHaveLength(2)
      expect(result[0].getIngredientStock().getStorageLocation().getType()).toBe(StorageType.FROZEN)
      expect(result[1].getIngredientStock().getStorageLocation().getType()).toBe(StorageType.FROZEN)
    })

    it('常温保存の食材を取得できる', async () => {
      const userId = 'user-123'
      const location = StorageType.ROOM_TEMPERATURE

      // 常温保存の食材
      const roomTempIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '米',
        categoryId: 'cat1',
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 5,
        unitId: 'unit1',
        threshold: 2,
        storageLocationType: 'ROOM_TEMPERATURE',
        storageLocationDetail: 'パントリー上段',
        bestBeforeDate: null, // 期限なし
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([roomTempIngredient])

      // 実行
      const result = await repository.findByStorageLocation(userId, location)

      // 結果の確認
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('米')
      expect(result[0].getIngredientStock().getStorageLocation().getType()).toBe(
        StorageType.ROOM_TEMPERATURE
      )
    })
  })
})
