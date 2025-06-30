import { describe, it, expect, beforeEach, vi } from 'vitest'

import { type PrismaClient } from '@/generated/prisma'
import { IngredientId, IngredientName } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'

import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('PrismaIngredientRepository - アクセス制御', () => {
  let repository: PrismaIngredientRepository
  let mockPrisma: any
  let userId1: string
  let categoryId: string
  let unitId: string

  beforeEach(() => {
    // テスト用IDの生成
    userId1 = testDataHelpers.userId()
    categoryId = testDataHelpers.categoryId()
    unitId = testDataHelpers.unitId()

    // Prismaのモック
    mockPrisma = {
      ingredient: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
    }
    repository = new PrismaIngredientRepository(mockPrisma as PrismaClient)
  })

  describe('findById', () => {
    it('修正後：userIdでフィルタリングされるため他のユーザーの食材は取得できない', async () => {
      const ingredientId = IngredientId.generate()

      // findFirstがnullを返す（他のユーザーの食材なので見つからない）
      mockPrisma.ingredient.findFirst.mockResolvedValue(null)

      // user1が他のユーザー（user2）の食材を検索しようとする
      const result = await repository.findById(userId1, ingredientId)

      // 修正後：他のユーザーの食材は取得できない
      expect(result).toBeNull()

      // findFirstの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId.getValue(),
          userId: userId1,
          deletedAt: null,
        },
      })
    })

    it('期待動作：userIdでフィルタリングして自分の食材のみ取得する', async () => {
      const ingredientId = IngredientId.generate()
      // user1の食材データ
      const user1Ingredient = {
        id: ingredientId.getValue(),
        userId: userId1,
        name: 'ユーザー1のトマト',
        categoryId: categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 3,
        unitId: unitId,
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(),
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findFirst.mockResolvedValue(user1Ingredient)

      // user1が自分の食材を検索
      const result = await repository.findById(userId1, ingredientId)

      // 期待動作：userIdでフィルタリングされている
      expect(result).not.toBeNull()
      expect(result?.getUserId()).toBe(userId1)

      // findFirstの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId.getValue(),
          userId: userId1,
          deletedAt: null,
        },
      })
    })
  })

  describe('findByName', () => {
    it('修正後：userIdでフィルタリングされるため他のユーザーの同名食材は取得できない', async () => {
      // findFirstがnullを返す（他のユーザーの食材なので見つからない）
      mockPrisma.ingredient.findFirst.mockResolvedValue(null)

      // user1が自分の「トマト」を検索
      const result = await repository.findByName(userId1, new IngredientName('トマト'))

      // 修正後：userIdでフィルタリングされる
      expect(result).toBeNull()

      // findFirstの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'トマト',
          userId: userId1,
          deletedAt: null,
        },
      })
    })
  })

  describe('findAll', () => {
    it('修正後：userIdでフィルタリングされるため自分の食材のみ取得する', async () => {
      const id1 = IngredientId.generate()
      const id2 = IngredientId.generate()
      // user1の食材データのみ
      const user1Ingredients = [
        {
          id: id1.getValue(),
          userId: userId1,
          name: 'ユーザー1のトマト',
          categoryId: categoryId,
          memo: null,
          price: null,
          purchaseDate: new Date(),
          quantity: 3,
          unitId: unitId,
          threshold: null,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: null,
          bestBeforeDate: new Date(),
          useByDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: id2.getValue(),
          userId: userId1,
          name: 'ユーザー1のキャベツ',
          categoryId: categoryId,
          memo: null,
          price: null,
          purchaseDate: new Date(),
          quantity: 1,
          unitId: unitId,
          threshold: null,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: null,
          bestBeforeDate: new Date(),
          useByDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]

      mockPrisma.ingredient.findMany.mockResolvedValue(user1Ingredients)

      // user1がfindAllを実行
      const results = await repository.findAll(userId1)

      // 修正後：user1の食材のみ取得される
      expect(results).toHaveLength(2)
      const userIds = results.map((r) => r.getUserId())
      expect(userIds.every((id) => id === userId1)).toBe(true)

      // findManyの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId1,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})
