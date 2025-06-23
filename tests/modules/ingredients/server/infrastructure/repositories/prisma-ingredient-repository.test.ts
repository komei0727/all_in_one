import { PrismaClient, Prisma } from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Quantity,
  UnitId,
  StorageLocation,
  StorageType,
  Price,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'

// Prismaクライアントのモック
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client')
  return {
    ...actual,
    PrismaClient: vi.fn(() => ({
      $transaction: vi.fn(),
      ingredient: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      ingredientStock: {
        create: vi.fn(),
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
    name: 'トマト',
    categoryId: '550e8400-e29b-41d4-a716-446655440001',
    memo: 'メモ',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
  }

  // テスト用の在庫データ
  const mockStockData = {
    id: 'clh1234567890abcdefghij',
    quantity: 2,
    unitId: '550e8400-e29b-41d4-a716-446655440002',
    storageLocationType: 'REFRIGERATOR',
    storageLocationDetail: '野菜室',
    bestBeforeDate: new Date('2024-01-10'),
    expiryDate: new Date('2024-01-15'),
    purchaseDate: new Date('2024-01-01'),
    price: new Prisma.Decimal(300),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
  }

  beforeEach(() => {
    prismaClient = new PrismaClient()
    repository = new PrismaIngredientRepository(prismaClient)
  })

  describe('save', () => {
    it('在庫ありの食材を保存できる', async () => {
      // テスト用の食材エンティティを作成
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        memo: new Memo('メモ'),
      })

      const stock = new IngredientStock({
        quantity: new Quantity(2),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        bestBeforeDate: new Date('2024-01-10'),
        expiryDate: new Date('2024-01-15'),
        purchaseDate: new Date('2024-01-01'),
        price: new Price(300),
      })

      ingredient.setStock(stock)

      // モックの設定
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const tx = {
          ingredient: {
            upsert: vi.fn().mockResolvedValue(mockIngredientData),
          },
          ingredientStock: {
            create: vi.fn().mockResolvedValue(mockStockData),
          },
        }
        return callback(tx)
      })
      prismaClient.$transaction = mockTransaction

      // 実行
      const result = await repository.save(ingredient)

      // 検証
      expect(mockTransaction).toHaveBeenCalled()
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.getName().getValue()).toBe('トマト')
      expect(result.getCurrentStock()).toBeDefined()
    })

    it('在庫なしの食材を保存できる', async () => {
      // テスト用の食材エンティティを作成（在庫なし）
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        memo: new Memo('メモ'),
      })

      // モックの設定
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const tx = {
          ingredient: {
            upsert: vi.fn().mockResolvedValue(mockIngredientData),
          },
          ingredientStock: {
            create: vi.fn(),
          },
        }
        return callback(tx)
      })
      prismaClient.$transaction = mockTransaction

      // 実行
      const result = await repository.save(ingredient)

      // 検証
      expect(mockTransaction).toHaveBeenCalled()
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getCurrentStock()).toBeNull()
    })
  })

  describe('findById', () => {
    it('IDで食材を検索できる', async () => {
      // モックの設定
      const mockFindUnique = vi.fn().mockResolvedValue({
        ...mockIngredientData,
        stocks: [mockStockData],
      })
      prismaClient.ingredient.findUnique = mockFindUnique

      // 実行
      const id = new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      const result = await repository.findById(id)

      // 検証
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          deletedAt: null,
        },
        include: {
          stocks: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result?.getCurrentStock()).toBeDefined()
    })

    it('存在しないIDの場合nullを返す', async () => {
      // モックの設定
      const mockFindUnique = vi.fn().mockResolvedValue(null)
      prismaClient.ingredient.findUnique = mockFindUnique

      // 実行
      const id = new IngredientId('550e8400-e29b-41d4-a716-446655440999')
      const result = await repository.findById(id)

      // 検証
      expect(result).toBeNull()
    })

    it('在庫がない食材を検索できる', async () => {
      // モックの設定
      const mockFindUnique = vi.fn().mockResolvedValue({
        ...mockIngredientData,
        stocks: [],
      })
      prismaClient.ingredient.findUnique = mockFindUnique

      // 実行
      const id = new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      const result = await repository.findById(id)

      // 検証
      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getCurrentStock()).toBeNull()
    })
  })

  describe('findByName', () => {
    it('名前で食材を検索できる', async () => {
      // モックの設定
      const mockFindFirst = vi.fn().mockResolvedValue({
        ...mockIngredientData,
        stocks: [mockStockData],
      })
      prismaClient.ingredient.findFirst = mockFindFirst

      // 実行
      const name = new IngredientName('トマト')
      const result = await repository.findByName(name)

      // 検証
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          name: 'トマト',
          deletedAt: null,
        },
        include: {
          stocks: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getName().getValue()).toBe('トマト')
    })

    it('存在しない名前の場合nullを返す', async () => {
      // モックの設定
      const mockFindFirst = vi.fn().mockResolvedValue(null)
      prismaClient.ingredient.findFirst = mockFindFirst

      // 実行
      const name = new IngredientName('存在しない食材')
      const result = await repository.findByName(name)

      // 検証
      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('すべての食材を取得できる', async () => {
      // モックの設定
      const mockFindMany = vi.fn().mockResolvedValue([
        {
          ...mockIngredientData,
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'トマト',
          stocks: [mockStockData],
        },
        {
          ...mockIngredientData,
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'キャベツ',
          stocks: [],
        },
      ])
      prismaClient.ingredient.findMany = mockFindMany

      // 実行
      const result = await repository.findAll()

      // 検証
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
        },
        include: {
          stocks: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(Ingredient)
      expect(result[0].getName().getValue()).toBe('トマト')
      expect(result[0].getCurrentStock()).toBeDefined()
      expect(result[1].getName().getValue()).toBe('キャベツ')
      expect(result[1].getCurrentStock()).toBeNull()
    })

    it('食材が存在しない場合空配列を返す', async () => {
      // モックの設定
      const mockFindMany = vi.fn().mockResolvedValue([])
      prismaClient.ingredient.findMany = mockFindMany

      // 実行
      const result = await repository.findAll()

      // 検証
      expect(result).toEqual([])
    })
  })

  describe('delete', () => {
    it('食材を論理削除できる', async () => {
      // モックの設定
      const mockUpdate = vi.fn().mockResolvedValue({
        ...mockIngredientData,
        deletedAt: new Date(),
      })
      prismaClient.ingredient.update = mockUpdate

      // 実行
      const id = new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      await repository.delete(id)

      // 検証
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        data: {
          deletedAt: expect.any(Date),
        },
      })
    })
  })

  describe('プライベートメソッド', () => {
    it('価格がnullの在庫データを正しく変換できる', async () => {
      // 価格がnullの在庫データ
      const stockDataWithNullPrice = {
        ...mockStockData,
        price: null,
      }

      // モックの設定
      const mockFindUnique = vi.fn().mockResolvedValue({
        ...mockIngredientData,
        stocks: [stockDataWithNullPrice],
      })
      prismaClient.ingredient.findUnique = mockFindUnique

      // 実行
      const id = new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      const result = await repository.findById(id)

      // 検証
      expect(result).toBeInstanceOf(Ingredient)
      const stock = result?.getCurrentStock()
      expect(stock?.getPrice()).toBeNull()
    })

    it('保管場所詳細がnullの在庫データを正しく変換できる', async () => {
      // 保管場所詳細がnullの在庫データ
      const stockDataWithNullDetail = {
        ...mockStockData,
        storageLocationDetail: null,
      }

      // モックの設定
      const mockFindUnique = vi.fn().mockResolvedValue({
        ...mockIngredientData,
        stocks: [stockDataWithNullDetail],
      })
      prismaClient.ingredient.findUnique = mockFindUnique

      // 実行
      const id = new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      const result = await repository.findById(id)

      // 検証
      expect(result).toBeInstanceOf(Ingredient)
      const stock = result?.getCurrentStock()
      expect(stock?.getStorageLocation().getDetail()).toBe('')
    })

    it('メモがnullの食材データを正しく変換できる', async () => {
      // メモがnullの食材データ
      const ingredientDataWithNullMemo = {
        ...mockIngredientData,
        memo: null,
      }

      // モックの設定
      const mockFindUnique = vi.fn().mockResolvedValue({
        ...ingredientDataWithNullMemo,
        stocks: [],
      })
      prismaClient.ingredient.findUnique = mockFindUnique

      // 実行
      const id = new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      const result = await repository.findById(id)

      // 検証
      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getMemo()).toBeNull()
    })
  })
})
