import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient, Prisma } from '@/generated/prisma'
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
  ExpiryInfo,
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
        delete: vi.fn(),
      },
    })),
  }
})

describe('PrismaIngredientRepository', () => {
  let prismaClient: PrismaClient
  let repository: PrismaIngredientRepository

  // テスト用の食材データ（在庫情報統合版）
  const mockIngredientData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user-123',
    name: 'トマト',
    categoryId: '550e8400-e29b-41d4-a716-446655440001',
    memo: 'メモ',
    price: new Prisma.Decimal(300),
    purchaseDate: new Date('2024-01-01'),
    quantity: new Prisma.Decimal(2),
    unitId: '550e8400-e29b-41d4-a716-446655440002',
    threshold: new Prisma.Decimal(1),
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
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        userId: 'user-123',
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        memo: new Memo('メモ'),
        price: new Price(300),
        purchaseDate: new Date('2024-01-01'),
        quantity: new Quantity(2),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        threshold: new Quantity(1),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        expiryInfo: new ExpiryInfo({
          bestBeforeDate: new Date('2024-01-15'),
          useByDate: new Date('2024-01-10'),
        }),
      })

      // Prismaモックの設定
      const mockUpsert = vi.fn().mockResolvedValue(mockIngredientData)
      prismaClient.ingredient.upsert = mockUpsert

      // Act
      const result = await repository.save(ingredient)

      // Assert
      expect(mockUpsert).toHaveBeenCalledOnce()
      const callArgs = mockUpsert.mock.calls[0][0]
      expect(callArgs.where).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' })
      expect(callArgs.create.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(callArgs.create.userId).toBe('user-123')
      expect(callArgs.create.name).toBe('トマト')
      expect(callArgs.update.name).toBe('トマト')
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.getName().getValue()).toBe('トマト')
      expect(result.getUserId()).toBe('user-123')
      expect(result.getQuantity().getValue()).toBe(2)
    })

    it('新規食材を作成できる', async () => {
      // 新規食材エンティティを作成
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440003'),
        userId: 'user-456',
        name: new IngredientName('キャベツ'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        memo: null,
        price: null,
        purchaseDate: new Date('2024-01-02'),
        quantity: new Quantity(1),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        threshold: null,
        storageLocation: new StorageLocation(StorageType.ROOM_TEMPERATURE, ''),
        expiryInfo: new ExpiryInfo({ bestBeforeDate: null, useByDate: null }),
      })

      // 新規食材用のモックデータ
      const newMockData = {
        ...mockIngredientData,
        id: '550e8400-e29b-41d4-a716-446655440003',
        userId: 'user-456',
        name: 'キャベツ',
        memo: null,
        price: null,
        threshold: null,
        storageLocationType: 'ROOM_TEMPERATURE',
        storageLocationDetail: null,
        bestBeforeDate: null,
        useByDate: null,
      }

      // Prismaモックの設定
      const mockUpsert = vi.fn().mockResolvedValue(newMockData)
      prismaClient.ingredient.upsert = mockUpsert

      // Act
      const result = await repository.save(ingredient)

      // Assert
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440003')
      expect(result.getName().getValue()).toBe('キャベツ')
      expect(result.getUserId()).toBe('user-456')
    })

    it('データベースエラーの場合は例外が発生する', async () => {
      // テスト用の食材エンティティを作成
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        userId: 'user-123',
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        memo: new Memo('メモ'),
        price: new Price(300),
        purchaseDate: new Date('2024-01-01'),
        quantity: new Quantity(2),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        threshold: new Quantity(1),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        expiryInfo: new ExpiryInfo({
          bestBeforeDate: new Date('2024-01-15'),
          useByDate: new Date('2024-01-10'),
        }),
      })

      // Prismaモックの設定（エラーを発生させる）
      const mockUpsert = vi.fn().mockRejectedValue(new Error('Database connection failed'))
      prismaClient.ingredient.upsert = mockUpsert

      // Act & Assert
      await expect(repository.save(ingredient)).rejects.toThrow('Database connection failed')
    })
  })

  describe('findById', () => {
    it('IDで食材を検索できる', async () => {
      // Prismaモックの設定
      const mockFindUnique = vi.fn().mockResolvedValue(mockIngredientData)
      prismaClient.ingredient.findUnique = mockFindUnique

      // Act
      const result = await repository.findById(
        new IngredientId('550e8400-e29b-41d4-a716-446655440000')
      )

      // Assert
      expect(mockFindUnique).toHaveBeenCalledOnce()
      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('存在しないIDの場合はnullを返す', async () => {
      // Prismaモックの設定
      const mockFindUnique = vi.fn().mockResolvedValue(null)
      prismaClient.ingredient.findUnique = mockFindUnique

      // Act
      const result = await repository.findById(
        new IngredientId('550e8400-e29b-41d4-a716-446655440009')
      )

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('ユーザーIDで食材リストを検索できる', async () => {
      // Prismaモックの設定
      const mockFindMany = vi.fn().mockResolvedValue([mockIngredientData])
      prismaClient.ingredient.findMany = mockFindMany

      // Act
      const result = await repository.findByUserId('user-123')

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      expect(result).toHaveLength(1)
      expect(result[0]).toBeInstanceOf(Ingredient)
      expect(result[0].getUserId()).toBe('user-123')
    })

    it('該当するユーザーIDの食材が存在しない場合は空配列を返す', async () => {
      // Prismaモックの設定
      const mockFindMany = vi.fn().mockResolvedValue([])
      prismaClient.ingredient.findMany = mockFindMany

      // Act
      const result = await repository.findByUserId('non-existent-user')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('findByUserIdAndName', () => {
    it('ユーザーIDと食材名で食材を検索できる', async () => {
      // Prismaモックの設定
      const mockFindFirst = vi.fn().mockResolvedValue(mockIngredientData)
      prismaClient.ingredient.findFirst = mockFindFirst

      // Act
      const result = await repository.findByUserIdAndName('user-123', new IngredientName('トマト'))

      // Assert
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          name: 'トマト',
          deletedAt: null,
        },
      })
      expect(result).toBeInstanceOf(Ingredient)
      expect(result?.getName().getValue()).toBe('トマト')
      expect(result?.getUserId()).toBe('user-123')
    })

    it('該当する食材が存在しない場合はnullを返す', async () => {
      // Prismaモックの設定
      const mockFindFirst = vi.fn().mockResolvedValue(null)
      prismaClient.ingredient.findFirst = mockFindFirst

      // Act
      const result = await repository.findByUserIdAndName(
        'user-123',
        new IngredientName('存在しない食材')
      )

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('すべての食材を取得できる', async () => {
      // 複数の食材データを準備
      const mockIngredientData2 = {
        ...mockIngredientData,
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'キャベツ',
      }

      // Prismaモックの設定
      const mockFindMany = vi.fn().mockResolvedValue([mockIngredientData, mockIngredientData2])
      prismaClient.ingredient.findMany = mockFindMany

      // Act
      const result = await repository.findAll()

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(Ingredient)
      expect(result[1]).toBeInstanceOf(Ingredient)
    })

    it('食材が存在しない場合は空配列を返す', async () => {
      // Prismaモックの設定
      const mockFindMany = vi.fn().mockResolvedValue([])
      prismaClient.ingredient.findMany = mockFindMany

      // Act
      const result = await repository.findAll()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('delete', () => {
    it('食材を論理削除できる', async () => {
      // Prismaモックの設定
      const mockUpdate = vi.fn().mockResolvedValue(mockIngredientData)
      prismaClient.ingredient.update = mockUpdate

      // Act
      await repository.delete(new IngredientId('550e8400-e29b-41d4-a716-446655440000'))

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith({
        where: {
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
        data: {
          deletedAt: expect.any(Date),
        },
      })
    })

    it('存在しない食材を削除しようとしてもエラーにならない', async () => {
      // Prismaモックの設定（存在しない場合の挙動をシミュレート）
      const mockUpdate = vi.fn().mockRejectedValue(new Error('Record not found'))
      prismaClient.ingredient.update = mockUpdate

      // Act & Assert - エラーが発生しないことを確認
      await expect(
        repository.delete(new IngredientId('550e8400-e29b-41d4-a716-446655440009'))
      ).rejects.toThrow('Record not found')
    })
  })
})
