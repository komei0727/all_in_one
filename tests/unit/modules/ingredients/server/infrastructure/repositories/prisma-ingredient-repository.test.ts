import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient, Prisma } from '@/generated/prisma'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  UnitId,
  StorageLocation,
  StorageType,
  Price,
  ExpiryInfo,
  IngredientStock,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

// Prismaクライアントのモック
vi.mock('@/generated/prisma', async () => {
  const actual = await vi.importActual('@/generated/prisma')
  return {
    ...actual,
    PrismaClient: vi.fn(() => ({
      ingredient: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    })),
  }
})

describe('PrismaIngredientRepository', () => {
  let prismaClient: PrismaClient
  let repository: PrismaIngredientRepository

  // テストで使用するIDを事前に生成
  const ingredientId = testDataHelpers.ingredientId()
  const categoryId = testDataHelpers.categoryId()
  const unitId = testDataHelpers.unitId()
  const userId = testDataHelpers.userId()

  // テスト用の食材データ
  const mockIngredientData = {
    id: ingredientId,
    userId: userId,
    name: 'トマト',
    categoryId: categoryId,
    memo: 'メモ',
    price: new Prisma.Decimal(300),
    purchaseDate: new Date('2024-01-01'),
    quantity: 2,
    unitId: unitId,
    threshold: 1,
    storageLocationType: 'REFRIGERATED',
    storageLocationDetail: '野菜室',
    bestBeforeDate: new Date('2024-01-15'),
    useByDate: new Date('2024-01-10'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  }

  beforeEach(() => {
    prismaClient = new PrismaClient()
    repository = new PrismaIngredientRepository(prismaClient)
  })

  describe('save', () => {
    it('食材を保存できる', async () => {
      // テスト用の食材エンティティを作成
      const ingredientStock = new IngredientStock({
        quantity: 2,
        unitId: new UnitId(unitId),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        threshold: 1,
      })

      const ingredient = new Ingredient({
        id: new IngredientId(ingredientId),
        userId: userId,
        name: new IngredientName('トマト'),
        categoryId: new CategoryId(categoryId),
        purchaseDate: new Date('2024-01-01'),
        ingredientStock,
        memo: new Memo('メモ'),
        price: new Price(300),
        expiryInfo: new ExpiryInfo({
          bestBeforeDate: new Date('2024-01-15'),
          useByDate: new Date('2024-01-10'),
        }),
      })

      // モックの設定
      vi.mocked(prismaClient.ingredient.upsert).mockResolvedValue(mockIngredientData as any)

      // 実行
      const result = await repository.save(ingredient)

      // 検証
      expect(prismaClient.ingredient.upsert).toHaveBeenCalledWith({
        where: { id: ingredientId },
        update: expect.objectContaining({
          userId: userId,
          name: 'トマト',
          categoryId: categoryId,
          memo: 'メモ',
          price: expect.any(Prisma.Decimal),
          purchaseDate: expect.any(Date),
          quantity: 2,
          unitId: unitId,
          threshold: 1,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: expect.any(Date),
          useByDate: expect.any(Date),
        }),
        create: expect.objectContaining({
          id: ingredientId,
          userId: userId,
          name: 'トマト',
          categoryId: categoryId,
          memo: 'メモ',
          price: expect.any(Prisma.Decimal),
          purchaseDate: expect.any(Date),
          quantity: 2,
          unitId: unitId,
          threshold: 1,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: expect.any(Date),
          useByDate: expect.any(Date),
        }),
      })

      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getId().getValue()).toBe(ingredientId)
      expect(result.getName().getValue()).toBe('トマト')
    })
  })

  describe('findById', () => {
    it('IDで食材を検索できる', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findFirst).mockResolvedValue(mockIngredientData as any)

      // 実行
      const result = await repository.findById(userId, new IngredientId(ingredientId))

      // 検証
      expect(prismaClient.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId,
          userId: userId,
          deletedAt: null,
        },
      })

      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getId().getValue()).toBe(ingredientId)
      expect(result?.getName().getValue()).toBe('トマト')
      expect(result?.getUserId()).toBe(userId)
    })

    it('存在しない場合はnullを返す', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findFirst).mockResolvedValue(null)

      // 実行
      const nonExistentId = testDataHelpers.ingredientId()
      const result = await repository.findById(userId, new IngredientId(nonExistentId))

      // 検証
      expect(result).toBeNull()
    })
  })

  describe('findByName', () => {
    it('名前で食材を検索できる', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findFirst).mockResolvedValue(mockIngredientData as any)

      // 実行
      const result = await repository.findByName(userId, new IngredientName('トマト'))

      // 検証
      expect(prismaClient.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'トマト',
          userId: userId,
          deletedAt: null,
        },
      })

      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getName().getValue()).toBe('トマト')
    })
  })

  describe('findAll', () => {
    it('すべての食材を取得できる', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findMany).mockResolvedValue([mockIngredientData] as any)

      // 実行
      const results = await repository.findAll(userId)

      // 検証
      expect(prismaClient.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toBeInstanceOf(Ingredient)
      expect(results[0].getName().getValue()).toBe('トマト')
    })
  })

  describe('findByUserId', () => {
    it('ユーザーIDで食材を検索できる', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findMany).mockResolvedValue([mockIngredientData] as any)

      // 実行
      const results = await repository.findByUserId(userId)

      // 検証
      expect(prismaClient.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toBeInstanceOf(Ingredient)
      expect(results[0].getUserId()).toBe(userId)
    })
  })

  describe('update', () => {
    it('既存の食材を更新できる', async () => {
      // テスト用の更新後食材エンティティを作成
      const ingredientStock = new IngredientStock({
        quantity: 5, // 更新後の数量
        unitId: new UnitId(unitId),
        storageLocation: new StorageLocation(StorageType.FROZEN, '冷凍庫上段'), // 更新後の保存場所
        threshold: 2, // 更新後の閾値
      })

      const updatedIngredient = new Ingredient({
        id: new IngredientId(ingredientId),
        userId: userId,
        name: new IngredientName('更新後トマト'), // 更新後の名前
        categoryId: new CategoryId(categoryId),
        purchaseDate: new Date('2024-01-01'),
        ingredientStock,
        memo: new Memo('更新後メモ'), // 更新後のメモ
        price: new Price(500), // 更新後の価格
        expiryInfo: new ExpiryInfo({
          bestBeforeDate: new Date('2024-01-20'), // 更新後の期限
          useByDate: new Date('2024-01-15'),
        }),
      })

      // 更新後のモックデータ
      const mockUpdatedData = {
        ...mockIngredientData,
        name: '更新後トマト',
        memo: '更新後メモ',
        price: new Prisma.Decimal(500),
        quantity: 5,
        threshold: 2,
        storageLocationType: 'FROZEN',
        storageLocationDetail: '冷凍庫上段',
        bestBeforeDate: new Date('2024-01-20'),
        useByDate: new Date('2024-01-15'),
        category: { id: categoryId, name: 'テストカテゴリー' },
        unit: { id: unitId, name: 'テスト単位', symbol: 'test' },
      }

      // モックの設定
      vi.mocked(prismaClient.ingredient.update).mockResolvedValue(mockUpdatedData as any)

      // 実行
      const result = await repository.update(updatedIngredient)

      // 検証：updateメソッドが正しく呼ばれている
      expect(prismaClient.ingredient.update).toHaveBeenCalledWith({
        where: { id: ingredientId },
        data: expect.objectContaining({
          userId: userId,
          name: '更新後トマト',
          categoryId: categoryId,
          memo: '更新後メモ',
          price: expect.any(Prisma.Decimal),
          purchaseDate: expect.any(Date),
          quantity: 5,
          unitId: unitId,
          threshold: 2,
          storageLocationType: 'FROZEN',
          storageLocationDetail: '冷凍庫上段',
          bestBeforeDate: expect.any(Date),
          useByDate: expect.any(Date),
          updatedAt: expect.any(Date),
          deletedAt: null,
        }),
        include: {
          category: true,
          unit: true,
        },
      })

      // 戻り値の検証
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getId().getValue()).toBe(ingredientId)
      expect(result.getName().getValue()).toBe('更新後トマト')
      expect(result.getMemo()?.getValue()).toBe('更新後メモ')
      expect(result.getPrice()?.getValue()).toBe(500)
      expect(result.getIngredientStock().getQuantity()).toBe(5)
      expect(result.getIngredientStock().getThreshold()).toBe(2)
    })

    it('存在しない食材の更新時はエラーが発生する', async () => {
      // 存在しない食材エンティティ
      const nonExistentIngredient = new Ingredient({
        id: new IngredientId(testDataHelpers.ingredientId()),
        userId: userId,
        name: new IngredientName('存在しない食材'),
        categoryId: new CategoryId(categoryId),
        purchaseDate: new Date(),
        ingredientStock: new IngredientStock({
          quantity: 1,
          unitId: new UnitId(unitId),
          storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        }),
      })

      // Prismaのupdateでエラーを発生させる
      const prismaError = new Error('Record to update not found.')
      vi.mocked(prismaClient.ingredient.update).mockRejectedValue(prismaError)

      // 実行・検証：エラーが投げられることを確認
      await expect(repository.update(nonExistentIngredient)).rejects.toThrow(
        'Record to update not found.'
      )
    })

    it('価格やメモがnullの場合も正しく更新できる', async () => {
      // 価格・メモなしの食材エンティティ
      const ingredientWithoutOptionals = new Ingredient({
        id: new IngredientId(ingredientId),
        userId: userId,
        name: new IngredientName('シンプルトマト'),
        categoryId: new CategoryId(categoryId),
        purchaseDate: new Date('2024-01-01'),
        ingredientStock: new IngredientStock({
          quantity: 3,
          unitId: new UnitId(unitId),
          storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        }),
        // memo, price, expiryInfoは設定しない（null）
      })

      const mockSimpleData = {
        ...mockIngredientData,
        name: 'シンプルトマト',
        memo: null,
        price: null,
        bestBeforeDate: null,
        useByDate: null,
        category: { id: categoryId, name: 'テストカテゴリー' },
        unit: { id: unitId, name: 'テスト単位', symbol: 'test' },
      }

      vi.mocked(prismaClient.ingredient.update).mockResolvedValue(mockSimpleData as any)

      // 実行
      const result = await repository.update(ingredientWithoutOptionals)

      // 検証：nullの値が正しく設定されている
      expect(prismaClient.ingredient.update).toHaveBeenCalledWith({
        where: { id: ingredientId },
        data: expect.objectContaining({
          name: 'シンプルトマト',
          memo: null,
          price: null,
          bestBeforeDate: null,
          useByDate: null,
        }),
        include: {
          category: true,
          unit: true,
        },
      })

      expect(result.getName().getValue()).toBe('シンプルトマト')
      expect(result.getMemo()).toBeNull()
      expect(result.getPrice()).toBeNull()
      expect(result.getExpiryInfo()).toBeNull()
    })
  })
})
