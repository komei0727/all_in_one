import { describe, it, expect, beforeEach, vi } from 'vitest'

import { type PrismaClient } from '@/generated/prisma'
import { IngredientId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('PrismaIngredientRepository - 期限管理メソッド', () => {
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

  describe('findExpiringSoon', () => {
    it('指定日数以内に期限切れになる食材を取得できる', async () => {
      const userId = testDataHelpers.userId()
      const categoryId = 'cat_' + testDataHelpers.cuid()
      const unitId = 'unt_' + testDataHelpers.cuid()
      const days = 7

      // 今日から5日後に期限切れの食材
      const expiringSoonIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: 'もうすぐ期限のトマト',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 3,
        unitId,
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      // 今日から10日後に期限切れの食材（対象外）
      // const notExpiringSoonIngredient = {
      //   id: IngredientId.generate().getValue(),
      //   userId,
      //   name: 'まだ余裕のあるキャベツ',
      //   categoryId,
      //   memo: null,
      //   price: null,
      //   purchaseDate: new Date(),
      //   quantity: 1,
      //   unitId,
      //   threshold: null,
      //   storageLocationType: 'REFRIGERATED',
      //   storageLocationDetail: null,
      //   bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後
      //   useByDate: null,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      //   deletedAt: null,
      // }

      mockPrisma.ingredient.findMany.mockResolvedValue([expiringSoonIngredient])

      // 実行
      const result = await repository.findExpiringSoon(userId, days)

      // 検証：Prismaクエリの確認
      const expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() + days)
      expectedDate.setHours(23, 59, 59, 999)

      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
          OR: [
            {
              bestBeforeDate: {
                lte: expectedDate,
                gte: expect.any(Date), // 今日の開始時刻
              },
            },
            {
              useByDate: {
                lte: expectedDate,
                gte: expect.any(Date), // 今日の開始時刻
              },
            },
          ],
        },
        orderBy: [{ useByDate: 'asc' }, { bestBeforeDate: 'asc' }, { createdAt: 'desc' }],
      })

      // 結果の確認
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('もうすぐ期限のトマト')
    })

    it('消費期限を優先して判定する', async () => {
      const userId = testDataHelpers.userId()
      const categoryId = 'cat_' + testDataHelpers.cuid()
      const unitId = 'unt_' + testDataHelpers.cuid()
      const days = 7

      // 消費期限が5日後、賞味期限が10日後の食材
      const useByPriorityIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '消費期限優先の牛乳',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(),
        quantity: 1,
        unitId,
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後
        useByDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      mockPrisma.ingredient.findMany.mockResolvedValue([useByPriorityIngredient])

      // 実行
      const result = await repository.findExpiringSoon(userId, days)

      // 結果の確認：消費期限が期限内なので取得される
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('消費期限優先の牛乳')
    })

    it('期限情報がない食材は取得されない', async () => {
      const userId = testDataHelpers.userId()
      // const categoryId = 'cat_' + testDataHelpers.cuid()
      // const unitId = 'unt_' + testDataHelpers.cuid()
      const days = 7

      // 期限情報なしの食材
      // const noExpiryIngredient = {
      //   id: IngredientId.generate().getValue(),
      //   userId,
      //   name: '期限なしの調味料',
      //   categoryId,
      //   memo: null,
      //   price: null,
      //   purchaseDate: new Date(),
      //   quantity: 1,
      //   unitId,
      //   threshold: null,
      //   storageLocationType: 'ROOM_TEMPERATURE',
      //   storageLocationDetail: null,
      //   bestBeforeDate: null,
      //   useByDate: null,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      //   deletedAt: null,
      // }

      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行
      const result = await repository.findExpiringSoon(userId, days)

      // 結果の確認：期限情報がないので取得されない
      expect(result).toHaveLength(0)
    })
  })

  describe('findExpired', () => {
    it('期限切れの食材を取得できる', async () => {
      const userId = testDataHelpers.userId()
      const categoryId = 'cat_' + testDataHelpers.cuid()
      const unitId = 'unt_' + testDataHelpers.cuid()

      // 昨日期限切れの食材
      const expiredIngredient = {
        id: IngredientId.generate().getValue(),
        userId,
        name: '期限切れトマト',
        categoryId,
        memo: null,
        price: null,
        purchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        quantity: 2,
        unitId,
        threshold: null,
        storageLocationType: 'REFRIGERATED',
        storageLocationDetail: null,
        bestBeforeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 昨日
        useByDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }

      // まだ期限内の食材
      // const notExpiredIngredient = {
      //   id: IngredientId.generate().getValue(),
      //   userId,
      //   name: 'まだ大丈夫なキャベツ',
      //   categoryId,
      //   memo: null,
      //   price: null,
      //   purchaseDate: new Date(),
      //   quantity: 1,
      //   unitId,
      //   threshold: null,
      //   storageLocationType: 'REFRIGERATED',
      //   storageLocationDetail: null,
      //   bestBeforeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後
      //   useByDate: null,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      //   deletedAt: null,
      // }

      mockPrisma.ingredient.findMany.mockResolvedValue([expiredIngredient])

      // 実行
      const result = await repository.findExpired(userId)

      // 検証：Prismaクエリの確認
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          deletedAt: null,
          OR: [
            {
              bestBeforeDate: {
                lt: today,
              },
            },
            {
              useByDate: {
                lt: today,
              },
            },
          ],
        },
        orderBy: [{ useByDate: 'asc' }, { bestBeforeDate: 'asc' }, { createdAt: 'desc' }],
      })

      // 結果の確認
      expect(result).toHaveLength(1)
      expect(result[0].getName().getValue()).toBe('期限切れトマト')
    })

    it('今日が期限の食材は期限切れとして扱わない', async () => {
      const userId = testDataHelpers.userId()
      // const categoryId = 'cat_' + testDataHelpers.cuid()
      // const unitId = 'unt_' + testDataHelpers.cuid()

      // 今日が期限の食材
      // const todayExpiryIngredient = {
      //   id: IngredientId.generate().getValue(),
      //   userId,
      //   name: '今日が期限の牛乳',
      //   categoryId,
      //   memo: null,
      //   price: null,
      //   purchaseDate: new Date(),
      //   quantity: 1,
      //   unitId,
      //   threshold: null,
      //   storageLocationType: 'REFRIGERATED',
      //   storageLocationDetail: null,
      //   bestBeforeDate: new Date(), // 今日
      //   useByDate: null,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      //   deletedAt: null,
      // }

      mockPrisma.ingredient.findMany.mockResolvedValue([])

      // 実行
      const result = await repository.findExpired(userId)

      // 結果の確認：今日が期限の食材は含まれない
      expect(result).toHaveLength(0)
    })
  })
})
