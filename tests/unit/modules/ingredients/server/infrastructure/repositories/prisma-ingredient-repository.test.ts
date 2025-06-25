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

  // テスト用の食材データ
  const mockIngredientData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user-123',
    name: 'トマト',
    categoryId: '550e8400-e29b-41d4-a716-446655440001',
    memo: 'メモ',
    price: new Prisma.Decimal(300),
    purchaseDate: new Date('2024-01-01'),
    quantity: 2,
    unitId: '550e8400-e29b-41d4-a716-446655440002',
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
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        threshold: 1,
      })

      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        userId: 'user-123',
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
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
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        update: expect.objectContaining({
          userId: 'user-123',
          name: 'トマト',
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
          memo: 'メモ',
          price: expect.any(Prisma.Decimal),
          purchaseDate: expect.any(Date),
          quantity: 2,
          unitId: '550e8400-e29b-41d4-a716-446655440002',
          threshold: 1,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: expect.any(Date),
          useByDate: expect.any(Date),
        }),
        create: expect.objectContaining({
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: 'user-123',
          name: 'トマト',
          categoryId: '550e8400-e29b-41d4-a716-446655440001',
          memo: 'メモ',
          price: expect.any(Prisma.Decimal),
          purchaseDate: expect.any(Date),
          quantity: 2,
          unitId: '550e8400-e29b-41d4-a716-446655440002',
          threshold: 1,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: expect.any(Date),
          useByDate: expect.any(Date),
        }),
      })

      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.getName().getValue()).toBe('トマト')
    })
  })

  describe('findById', () => {
    it('IDで食材を検索できる', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findUnique).mockResolvedValue(mockIngredientData as any)

      // 実行
      const result = await repository.findById(
        new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      )

      // 検証
      expect(prismaClient.ingredient.findUnique).toHaveBeenCalledWith({
        where: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          deletedAt: null,
        },
      })

      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result?.getName().getValue()).toBe('トマト')
      expect(result?.getUserId()).toBe('user-123')
    })

    it('存在しない場合はnullを返す', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findUnique).mockResolvedValue(null)

      // 実行
      const result = await repository.findById(
        new IngredientId('550e8400-e29b-41d4-a716-446655440999')
      )

      // 検証
      expect(result).toBeNull()
    })
  })

  describe('findByName', () => {
    it('名前で食材を検索できる', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.findFirst).mockResolvedValue(mockIngredientData as any)

      // 実行
      const result = await repository.findByName(new IngredientName('トマト'))

      // 検証
      expect(prismaClient.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'トマト',
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
      const results = await repository.findAll()

      // 検証
      expect(prismaClient.ingredient.findMany).toHaveBeenCalledWith({
        where: {
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
      const results = await repository.findByUserId('user-123')

      // 検証
      expect(prismaClient.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toBeInstanceOf(Ingredient)
      expect(results[0].getUserId()).toBe('user-123')
    })
  })

  describe('delete', () => {
    it('食材を論理削除できる', async () => {
      // モックの設定
      vi.mocked(prismaClient.ingredient.update).mockResolvedValue({
        ...mockIngredientData,
        deletedAt: new Date(),
      } as any)

      // 実行
      await repository.delete(new IngredientId('550e8400-e29b-41d4-a716-446655440000'))

      // 検証
      expect(prismaClient.ingredient.update).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        data: {
          deletedAt: expect.any(Date),
        },
      })
    })
  })
})
