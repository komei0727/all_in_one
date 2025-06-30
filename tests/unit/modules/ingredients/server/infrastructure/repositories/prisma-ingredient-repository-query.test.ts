import { describe, it, expect, beforeEach, vi } from 'vitest'

import { Prisma, type PrismaClient } from '@/generated/prisma'
import { IngredientId, StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'

import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('PrismaIngredientRepository - クエリメソッド', () => {
  let repository: PrismaIngredientRepository
  let mockPrisma: any
  let userId: string
  let categoryId: string
  let unitId: string

  beforeEach(() => {
    // テスト用IDの生成
    userId = testDataHelpers.userId()
    categoryId = testDataHelpers.categoryId()
    unitId = testDataHelpers.unitId()

    // Prismaのモック
    mockPrisma = {
      ingredient: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    }
    repository = new PrismaIngredientRepository(mockPrisma as PrismaClient)
  })

  describe('findMany', () => {
    it('基本的なページネーション検索ができる', async () => {
      // テストデータ
      const mockIngredients = [
        {
          id: IngredientId.generate().getValue(),
          userId,
          name: 'トマト',
          categoryId,
          memo: null,
          price: new Prisma.Decimal(300),
          purchaseDate: new Date(),
          quantity: 2,
          unitId,
          threshold: null,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: null,
          bestBeforeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
          useByDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          category: { id: categoryId, name: 'テストカテゴリー' },
          unit: { id: unitId, name: 'テスト単位', symbol: 'test' },
        },
      ]

      mockPrisma.ingredient.findMany.mockResolvedValue(mockIngredients)

      // 実行
      const criteria = {
        userId,
        page: 1,
        limit: 10,
      }
      const result = await repository.findMany(criteria)

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0, // (page - 1) * limit = (1 - 1) * 10
        take: 10,
        include: {
          category: true,
          unit: true,
        },
      })

      // 結果の確認
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('トマト')
    })

    it('2ページ目のデータを取得できる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：2ページ目（11件目から20件目）
      const criteria = {
        userId,
        page: 2,
        limit: 10,
      }
      await repository.findMany(criteria)

      // 検証：skipが正しく計算されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit = (2 - 1) * 10
          take: 10,
        })
      )
    })

    it('食材名で検索できる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：食材名検索
      const criteria = {
        userId,
        page: 1,
        limit: 10,
        search: 'トマト',
      }
      await repository.findMany(criteria)

      // 検証：検索条件が追加されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            deletedAt: null,
            name: {
              contains: 'トマト',
            },
          },
        })
      )
    })

    it('カテゴリーIDで絞り込めする', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：カテゴリー絞り込み
      const targetCategoryId = testDataHelpers.categoryId()
      const criteria = {
        userId,
        page: 1,
        limit: 10,
        categoryId: targetCategoryId,
      }
      await repository.findMany(criteria)

      // 検証：カテゴリー条件が追加されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            deletedAt: null,
            categoryId: targetCategoryId,
          },
        })
      )
    })

    it('期限切れの食材のみ検索できる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：期限切れ検索
      const criteria = {
        userId,
        page: 1,
        limit: 10,
        expiryStatus: 'expired' as const,
      }
      await repository.findMany(criteria)

      // 検証：期限切れ条件が追加されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            deletedAt: null,
            OR: [
              {
                bestBeforeDate: {
                  not: null,
                  lt: expect.any(Date), // 現在時刻より前
                },
              },
              {
                useByDate: {
                  not: null,
                  lt: expect.any(Date), // 現在時刻より前
                },
              },
            ],
          },
        })
      )
    })

    it('期限切れ間近の食材のみ検索できる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：期限切れ間近検索
      const criteria = {
        userId,
        page: 1,
        limit: 10,
        expiryStatus: 'expiring' as const,
      }
      await repository.findMany(criteria)

      // 検証：期限切れ間近条件が追加されている（ORで設定）
      const call = mockPrisma.ingredient.findMany.mock.calls[0][0]
      expect(call.where.OR).toBeDefined()
      expect(call.where.OR).toHaveLength(2)

      // 期限切れ間近の条件確認（現在から3日以内）
      const firstCondition = call.where.OR[0]
      expect(firstCondition.bestBeforeDate).toBeDefined()
      expect(firstCondition.bestBeforeDate.gte).toBeInstanceOf(Date)
      expect(firstCondition.bestBeforeDate.lte).toBeInstanceOf(Date)

      const secondCondition = call.where.OR[1]
      expect(secondCondition.useByDate).toBeDefined()
      expect(secondCondition.useByDate.gte).toBeInstanceOf(Date)
      expect(secondCondition.useByDate.lte).toBeInstanceOf(Date)
    })

    it('新鮮な食材のみ検索できる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：新鮮な食材検索
      const criteria = {
        userId,
        page: 1,
        limit: 10,
        expiryStatus: 'fresh' as const,
      }
      await repository.findMany(criteria)

      // 検証：新鮮な食材条件が追加されている（ANDで設定）
      const call = mockPrisma.ingredient.findMany.mock.calls[0][0]
      expect(call.where.AND).toBeDefined()
      expect(call.where.AND).toHaveLength(2)

      // 第1条件：bestBeforeDate > 3日後 OR bestBeforeDate = null
      const firstCondition = call.where.AND[0]
      expect(firstCondition.OR).toBeDefined()
      expect(firstCondition.OR).toHaveLength(2)
      expect(firstCondition.OR[0].bestBeforeDate.gt).toBeInstanceOf(Date)
      expect(firstCondition.OR[1].bestBeforeDate).toBeNull()

      // 第2条件：useByDate > 3日後 OR useByDate = null
      const secondCondition = call.where.AND[1]
      expect(secondCondition.OR).toBeDefined()
      expect(secondCondition.OR).toHaveLength(2)
      expect(secondCondition.OR[0].useByDate.gt).toBeInstanceOf(Date)
      expect(secondCondition.OR[1].useByDate).toBeNull()
    })

    it('食材名でソートできる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：食材名昇順ソート
      const criteria = {
        userId,
        page: 1,
        limit: 10,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
      }
      await repository.findMany(criteria)

      // 検証：ソート条件が設定されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      )
    })

    it('期限日でソートできる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：期限日降順ソート
      const criteria = {
        userId,
        page: 1,
        limit: 10,
        sortBy: 'expiryDate' as const,
        sortOrder: 'desc' as const,
      }
      await repository.findMany(criteria)

      // 検証：bestBeforeDate のソート条件が設定されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { bestBeforeDate: 'desc' },
        })
      )
    })

    it('複数の検索条件を組み合わせできる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：複合検索
      const targetCategoryId = testDataHelpers.categoryId()
      const criteria = {
        userId,
        page: 2,
        limit: 5,
        search: 'キャベツ',
        categoryId: targetCategoryId,
        expiryStatus: 'all' as const,
        sortBy: 'purchaseDate' as const,
        sortOrder: 'desc' as const,
      }
      await repository.findMany(criteria)

      // 検証：全ての条件が組み合わさっている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
          name: {
            contains: 'キャベツ',
          },
          categoryId: targetCategoryId,
        },
        orderBy: { purchaseDate: 'desc' },
        skip: 5, // (2 - 1) * 5
        take: 5,
        include: {
          category: true,
          unit: true,
        },
      })
    })
  })

  describe('count', () => {
    it('基本的な件数取得ができる', async () => {
      // モック設定
      mockPrisma.ingredient.count.mockResolvedValue(25)

      // 実行
      const criteria = {
        userId,
      }
      const result = await repository.count(criteria)

      // 検証
      expect(mockPrisma.ingredient.count).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
        },
      })
      expect(result).toBe(25)
    })

    it('検索条件を適用した件数取得ができる', async () => {
      mockPrisma.ingredient.count.mockResolvedValue(3)

      // 実行：検索条件付き
      const targetCategoryId = testDataHelpers.categoryId()
      const criteria = {
        userId,
        search: 'トマト',
        categoryId: targetCategoryId,
        expiryStatus: 'expired' as const,
      }
      const result = await repository.count(criteria)

      // 検証：findManyと同じ条件が使われている
      expect(mockPrisma.ingredient.count).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
          name: {
            contains: 'トマト',
          },
          categoryId: targetCategoryId,
          OR: [
            {
              bestBeforeDate: {
                not: null,
                lt: expect.any(Date),
              },
            },
            {
              useByDate: {
                not: null,
                lt: expect.any(Date),
              },
            },
          ],
        },
      })
      expect(result).toBe(3)
    })

    it('該当なしの場合は0を返す', async () => {
      mockPrisma.ingredient.count.mockResolvedValue(0)

      // 実行
      const criteria = {
        userId: testDataHelpers.userId(), // 存在しないユーザー
      }
      const result = await repository.count(criteria)

      // 検証
      expect(result).toBe(0)
    })
  })

  describe('findDuplicates', () => {
    it('完全一致する重複食材を検索できる', async () => {
      // 重複食材のモックデータ
      const duplicateIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: 'トマト',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 2,
        unitId,
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: '野菜室',
        bestBeforeDate: new Date('2024-01-15'),
        useByDate: new Date('2024-01-10'),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: { id: categoryId, name: 'テストカテゴリー' },
        unit: { id: unitId, name: 'テスト単位', symbol: 'test' },
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([duplicateIngredient])

      // 実行
      const criteria = {
        userId,
        name: 'トマト',
        expiryInfo: {
          bestBeforeDate: new Date('2024-01-15'),
          useByDate: new Date('2024-01-10'),
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
          detail: '野菜室',
        },
      }
      const result = await repository.findDuplicates(criteria)

      // 検証：完全一致条件が設定されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          name: 'トマト',
          deletedAt: null,
          bestBeforeDate: new Date('2024-01-15'),
          useByDate: new Date('2024-01-10'),
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
        },
        include: {
          category: true,
          unit: true,
        },
      })

      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('トマト')
    })

    it('期限情報がnullの場合の重複検索ができる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：期限なしの食材
      const criteria = {
        userId,
        name: '米',
        expiryInfo: null,
        storageLocation: {
          type: StorageType.ROOM_TEMPERATURE,
          detail: 'パントリー',
        },
      }
      await repository.findDuplicates(criteria)

      // 検証：期限がnullで検索されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          name: '米',
          deletedAt: null,
          bestBeforeDate: null,
          useByDate: null,
          storageLocationType: 'ROOM_TEMPERATURE',
          storageLocationDetail: 'パントリー',
        },
        include: {
          category: true,
          unit: true,
        },
      })
    })

    it('保存場所の詳細がない場合の重複検索ができる', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行：保存場所詳細なし
      const criteria = {
        userId,
        name: '牛乳',
        expiryInfo: {
          bestBeforeDate: new Date('2024-01-20'),
          useByDate: null,
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
        },
      }
      await repository.findDuplicates(criteria)

      // 検証：保存場所詳細がnullで検索されている
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          name: '牛乳',
          deletedAt: null,
          bestBeforeDate: new Date('2024-01-20'),
          useByDate: null,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: null,
        },
        include: {
          category: true,
          unit: true,
        },
      })
    })

    it('重複がない場合は空配列を返す', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行
      const criteria = {
        userId,
        name: 'ユニークな食材',
        expiryInfo: null,
        storageLocation: {
          type: StorageType.FROZEN,
        },
      }
      const result = await repository.findDuplicates(criteria)

      // 検証
      expect(result).toHaveLength(0)
    })
  })
})
