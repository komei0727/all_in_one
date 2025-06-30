import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { PrismaClient } from '@/generated/prisma'
import type { IngredientDetailView } from '@/modules/ingredients/server/application/views/ingredient-detail.view'
import { PrismaIngredientQueryService } from '@/modules/ingredients/server/infrastructure/query-services/prisma-ingredient-query-service'

// モックPrismaクライアント
const mockPrisma = {
  ingredient: {
    findFirst: vi.fn(),
  },
} as unknown as PrismaClient

describe('PrismaIngredientQueryService', () => {
  let queryService: PrismaIngredientQueryService

  beforeEach(() => {
    vi.clearAllMocks()
    queryService = new PrismaIngredientQueryService(mockPrisma)
  })

  describe('findDetailById', () => {
    const userId = 'user-123'
    const ingredientId = 'ingredient-456'

    it('有効な食材IDで詳細情報を取得する', async () => {
      // Given: データベースに存在する食材データ
      const mockDbResult = {
        id: ingredientId,
        userId: userId,
        name: 'トマト',
        categoryId: 'category-1',
        price: 200,
        purchaseDate: new Date('2024-01-15'),
        bestBeforeDate: new Date('2024-01-25'),
        useByDate: null,
        quantity: 3,
        unitId: 'unit-1',
        storageLocationType: 'REFRIGERATOR',
        storageLocationDetail: '野菜室',
        threshold: 1,
        memo: '新鮮なトマト',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-15T15:30:00Z'),
        deletedAt: null,
        category: {
          id: 'category-1',
          name: '野菜',
        },
        unit: {
          id: 'unit-1',
          name: '個',
          symbol: '個',
        },
      }

      mockPrisma.ingredient.findFirst = vi.fn().mockResolvedValue(mockDbResult)

      // When: 食材詳細を取得
      const result = await queryService.findDetailById(userId, ingredientId)

      // Then: 期待するデータ構造を返す
      const expected: IngredientDetailView = {
        id: ingredientId,
        userId: userId,
        name: 'トマト',
        categoryId: 'category-1',
        categoryName: '野菜',
        price: 200,
        purchaseDate: '2024-01-15',
        bestBeforeDate: '2024-01-25',
        useByDate: null,
        quantity: 3,
        unitId: 'unit-1',
        unitName: '個',
        unitSymbol: '個',
        storageType: 'REFRIGERATOR',
        storageDetail: '野菜室',
        threshold: 1,
        memo: '新鮮なトマト',
        createdAt: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-01-15T15:30:00.000Z',
      }

      expect(result).toEqual(expected)

      // Prismaクエリが正しい条件で呼ばれることを確認
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId,
          userId: userId,
          deletedAt: null,
        },
        include: {
          category: true,
          unit: true,
        },
      })
    })

    it('存在しない食材IDでnullを返す', async () => {
      // Given: データベースに存在しない食材ID
      mockPrisma.ingredient.findFirst = vi.fn().mockResolvedValue(null)

      // When: 存在しない食材詳細を取得
      const result = await queryService.findDetailById(userId, 'non-existent-id')

      // Then: nullを返す
      expect(result).toBeNull()
    })

    it('削除済み食材を除外する', async () => {
      // Given: 削除済みの食材データ
      mockPrisma.ingredient.findFirst = vi.fn().mockResolvedValue(null)

      // When: 削除済み食材の詳細を取得
      const result = await queryService.findDetailById(userId, ingredientId)

      // Then: nullを返す（削除済みフィルターが働く）
      expect(result).toBeNull()
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId,
          userId: userId,
          deletedAt: null, // 削除済み除外条件
        },
        include: {
          category: true,
          unit: true,
        },
      })
    })

    it('他ユーザーの食材にアクセスできない', async () => {
      // Given: 他ユーザーの食材データ
      mockPrisma.ingredient.findFirst = vi.fn().mockResolvedValue(null)

      // When: 他ユーザーの食材詳細を取得
      const result = await queryService.findDetailById('other-user', ingredientId)

      // Then: nullを返す（ユーザーIDフィルターが働く）
      expect(result).toBeNull()
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId,
          userId: 'other-user',
          deletedAt: null,
        },
        include: {
          category: true,
          unit: true,
        },
      })
    })

    it('カテゴリーがnullの場合でも正常に動作する', async () => {
      // Given: カテゴリーなしの食材データ
      const mockDbResult = {
        id: ingredientId,
        userId: userId,
        name: 'その他の食材',
        categoryId: null,
        price: null,
        purchaseDate: new Date('2024-01-15'),
        bestBeforeDate: null,
        useByDate: null,
        quantity: 1,
        unitId: 'unit-1',
        storageLocationType: 'PANTRY',
        storageLocationDetail: null,
        threshold: null,
        memo: null,
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-15T15:30:00Z'),
        deletedAt: null,
        category: null,
        unit: {
          id: 'unit-1',
          name: '個',
          symbol: '個',
        },
      }

      mockPrisma.ingredient.findFirst = vi.fn().mockResolvedValue(mockDbResult)

      // When: カテゴリーなし食材の詳細を取得
      const result = await queryService.findDetailById(userId, ingredientId)

      // Then: カテゴリー情報がnullで返される
      expect(result).toEqual({
        id: ingredientId,
        userId: userId,
        name: 'その他の食材',
        categoryId: null,
        categoryName: null,
        price: null,
        purchaseDate: '2024-01-15',
        bestBeforeDate: null,
        useByDate: null,
        quantity: 1,
        unitId: 'unit-1',
        unitName: '個',
        unitSymbol: '個',
        storageType: 'PANTRY',
        storageDetail: null,
        threshold: null,
        memo: null,
        createdAt: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-01-15T15:30:00.000Z',
      })
    })
  })
})
