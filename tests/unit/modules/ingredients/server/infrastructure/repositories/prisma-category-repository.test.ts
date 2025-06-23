import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/prisma/client'
import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'
import { CategoryId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'

// Prismaクライアントのモック
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

/**
 * PrismaCategoryRepository のテスト
 *
 * テスト対象:
 * - Prismaを使用したカテゴリーリポジトリの実装
 * - データベースからのデータ取得とエンティティへの変換
 * - 依存性逆転の原則に基づくリポジトリ実装
 */
describe('PrismaCategoryRepository', () => {
  let repository: PrismaCategoryRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new PrismaCategoryRepository(prisma as unknown as PrismaClient)
  })

  describe('findAllActive', () => {
    it('should return active categories as entities', async () => {
      // アクティブなカテゴリーをデータベースから取得し、エンティティに変換することを確認
      // Arrange
      const mockDbCategories = [
        {
          id: 'cat1',
          name: '野菜',
          displayOrder: 1,
          isActive: true,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat2',
          name: '肉類',
          displayOrder: 2,
          isActive: true,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(prisma.category.findMany).mockResolvedValue(mockDbCategories)

      // Act
      const result = await repository.findAllActive()

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(Category)
      expect(result[0].id.getValue()).toBe('cat1')
      expect(result[0].name.getValue()).toBe('野菜')
      expect(result[0].displayOrder.getValue()).toBe(1)

      expect(result[1]).toBeInstanceOf(Category)
      expect(result[1].id.getValue()).toBe('cat2')
      expect(result[1].name.getValue()).toBe('肉類')
      expect(result[1].displayOrder.getValue()).toBe(2)

      // Prismaクエリの確認
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      })
    })

    it('should return empty array when no active categories exist', async () => {
      // アクティブなカテゴリーが存在しない場合、空配列を返すことを確認
      // Arrange
      vi.mocked(prisma.category.findMany).mockResolvedValue([])

      // Act
      const result = await repository.findAllActive()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findById', () => {
    it('should return category entity when found', async () => {
      // IDでカテゴリーを検索し、見つかった場合はエンティティを返すことを確認
      // Arrange
      const mockDbCategory = {
        id: 'cat1',
        name: '野菜',
        displayOrder: 1,
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(prisma.category.findUnique).mockResolvedValue(mockDbCategory)

      // Act
      const result = await repository.findById(new CategoryId('cat1'))

      // Assert
      expect(result).toBeInstanceOf(Category)
      expect(result?.id.getValue()).toBe('cat1')
      expect(result?.name.getValue()).toBe('野菜')
      expect(result?.displayOrder.getValue()).toBe(1)

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat1' },
      })
    })

    it('should return null when category not found', async () => {
      // カテゴリーが見つからない場合、nullを返すことを確認
      // Arrange
      vi.mocked(prisma.category.findUnique).mockResolvedValue(null)

      // Act
      const result = await repository.findById(new CategoryId('non-existent-id'))

      // Assert
      expect(result).toBeNull()
    })
  })
})
