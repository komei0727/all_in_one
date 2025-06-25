import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@/generated/prisma'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { IngredientBuilder } from '../../../../../../__fixtures__/builders'
import { IngredientId, IngredientName } from '@/modules/ingredients/server/domain/value-objects'

describe('PrismaIngredientRepository - アクセス制御', () => {
  let repository: PrismaIngredientRepository
  let mockPrisma: any

  beforeEach(() => {
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
      const result = await repository.findById('user1', ingredientId)

      // 修正後：他のユーザーの食材は取得できない
      expect(result).toBeNull()

      // findFirstの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId.getValue(),
          userId: 'user1',
          deletedAt: null,
        },
      })
    })

    it('期待動作：userIdでフィルタリングして自分の食材のみ取得する', async () => {
      const ingredientId = IngredientId.generate()
      // user1の食材データ
      const user1Ingredient = {
        id: ingredientId.getValue(),
        userId: 'user1',
        name: 'ユーザー1のトマト',
        categoryId: 'cat1',
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

      mockPrisma.ingredient.findFirst.mockResolvedValue(user1Ingredient)

      // user1が自分の食材を検索
      const result = await repository.findById('user1', ingredientId)

      // 期待動作：userIdでフィルタリングされている
      expect(result).not.toBeNull()
      expect(result?.getUserId()).toBe('user1')

      // findFirstの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId.getValue(),
          userId: 'user1',
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
      const result = await repository.findByName('user1', new IngredientName('トマト'))

      // 修正後：userIdでフィルタリングされる
      expect(result).toBeNull()

      // findFirstの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'トマト',
          userId: 'user1',
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
          userId: 'user1',
          name: 'ユーザー1のトマト',
          categoryId: 'cat1',
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
        },
        {
          id: id2.getValue(),
          userId: 'user1',
          name: 'ユーザー1のキャベツ',
          categoryId: 'cat1',
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
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]

      mockPrisma.ingredient.findMany.mockResolvedValue(user1Ingredients)

      // user1がfindAllを実行
      const results = await repository.findAll('user1')

      // 修正後：user1の食材のみ取得される
      expect(results).toHaveLength(2)
      const userIds = results.map((r) => r.getUserId())
      expect(userIds.every((id) => id === 'user1')).toBe(true)

      // findManyの呼び出しを確認：userIdでのフィルタリングがある
      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('delete', () => {
    it('修正後：他のユーザーの食材は削除できない', async () => {
      const ingredientId = IngredientId.generate()

      // findFirstがnullを返す（他のユーザーの食材なので見つからない）
      mockPrisma.ingredient.findFirst.mockResolvedValue(null)

      // user1が他のユーザーの食材を削除しようとする
      await repository.delete('user1', ingredientId)

      // 修正後：findFirstでチェックしてからしか削除されない
      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          id: ingredientId.getValue(),
          userId: 'user1',
          deletedAt: null,
        },
      })

      // updateは呼ばれない（食材が見つからなかったため）
      expect(mockPrisma.ingredient.update).not.toHaveBeenCalled()
    })

    it('自分の食材は削除できる', async () => {
      const ingredientId = IngredientId.generate()
      const user1Ingredient = {
        id: ingredientId.getValue(),
        userId: 'user1',
        name: 'ユーザー1のトマト',
        categoryId: 'cat1',
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

      // findFirstが食材を返す
      mockPrisma.ingredient.findFirst.mockResolvedValue(user1Ingredient)
      mockPrisma.ingredient.update.mockResolvedValue({})

      // user1が自分の食材を削除
      await repository.delete('user1', ingredientId)

      // 削除が実行される
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: ingredientId.getValue() },
        data: {
          deletedAt: expect.any(Date),
        },
      })
    })
  })
})
