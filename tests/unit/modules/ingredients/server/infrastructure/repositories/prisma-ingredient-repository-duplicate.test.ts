import { describe, it, expect, beforeEach, vi } from 'vitest'

import { type PrismaClient } from '@/generated/prisma'
import {
  IngredientName,
  ExpiryInfo,
  StorageLocation,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'

describe('PrismaIngredientRepository - 重複チェックメソッド', () => {
  let repository: PrismaIngredientRepository
  let mockPrisma: any

  beforeEach(() => {
    // Prismaのモック
    mockPrisma = {
      ingredient: {
        count: vi.fn(),
      },
    }
    repository = new PrismaIngredientRepository(mockPrisma as PrismaClient)
  })

  describe('existsByUserAndNameAndExpiryAndLocation', () => {
    it('同じユーザー、名前、期限情報、保存場所の食材が存在する場合はtrueを返す', async () => {
      const userId = 'user-123'
      const name = new IngredientName('トマト')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-12-31'),
        useByDate: new Date('2024-12-30'),
      })
      const location = new StorageLocation(StorageType.REFRIGERATED, '野菜室')

      // 存在する場合
      mockPrisma.ingredient.count.mockResolvedValue(1)

      // 実行
      const result = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        name,
        expiryInfo,
        location
      )

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.count).toHaveBeenCalledWith({
        where: {
          userId,
          name: 'トマト',
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: new Date('2024-12-31'),
          useByDate: new Date('2024-12-30'),
          deletedAt: null,
        },
      })

      // 結果の確認
      expect(result).toBe(true)
    })

    it('期限情報がない場合の重複チェックができる', async () => {
      const userId = 'user-123'
      const name = new IngredientName('塩')
      const expiryInfo = null // 期限情報なし
      const location = new StorageLocation(StorageType.ROOM_TEMPERATURE, 'パントリー')

      // 存在する場合
      mockPrisma.ingredient.count.mockResolvedValue(1)

      // 実行
      const result = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        name,
        expiryInfo,
        location
      )

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.count).toHaveBeenCalledWith({
        where: {
          userId,
          name: '塩',
          storageLocationType: 'ROOM_TEMPERATURE',
          storageLocationDetail: 'パントリー',
          bestBeforeDate: null,
          useByDate: null,
          deletedAt: null,
        },
      })

      // 結果の確認
      expect(result).toBe(true)
    })

    it('保存場所の詳細がない場合の重複チェックができる', async () => {
      const userId = 'user-123'
      const name = new IngredientName('牛乳')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-12-25'),
        useByDate: null,
      })
      const location = new StorageLocation(StorageType.REFRIGERATED) // 詳細なし

      // 存在しない場合
      mockPrisma.ingredient.count.mockResolvedValue(0)

      // 実行
      const result = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        name,
        expiryInfo,
        location
      )

      // 検証：Prismaクエリの確認
      expect(mockPrisma.ingredient.count).toHaveBeenCalledWith({
        where: {
          userId,
          name: '牛乳',
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: null,
          bestBeforeDate: new Date('2024-12-25'),
          useByDate: null,
          deletedAt: null,
        },
      })

      // 結果の確認
      expect(result).toBe(false)
    })

    it('賞味期限のみの場合の重複チェックができる', async () => {
      const userId = 'user-123'
      const name = new IngredientName('ヨーグルト')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-12-20'),
        useByDate: null, // 消費期限なし
      })
      const location = new StorageLocation(StorageType.REFRIGERATED)

      // 複数存在する場合
      mockPrisma.ingredient.count.mockResolvedValue(2)

      // 実行
      const result = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        name,
        expiryInfo,
        location
      )

      // 結果の確認：1つ以上存在すればtrue
      expect(result).toBe(true)
    })

    it('異なるユーザーの同じ食材は重複として扱わない', async () => {
      const userId = 'user-123'
      const name = new IngredientName('りんご')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-12-15'),
        useByDate: null,
      })
      const location = new StorageLocation(StorageType.REFRIGERATED)

      // user-123の食材は存在しない
      mockPrisma.ingredient.count.mockResolvedValue(0)

      // 実行
      const result = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        name,
        expiryInfo,
        location
      )

      // 結果の確認
      expect(result).toBe(false)
    })

    it('論理削除された食材は重複として扱わない', async () => {
      const userId = 'user-123'
      const name = new IngredientName('削除済みトマト')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-12-31'),
        useByDate: null,
      })
      const location = new StorageLocation(StorageType.REFRIGERATED)

      // 論理削除された食材は除外されるため0
      mockPrisma.ingredient.count.mockResolvedValue(0)

      // 実行
      const result = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        name,
        expiryInfo,
        location
      )

      // PrismaクエリにdeletedAt: nullが含まれることを確認
      expect(mockPrisma.ingredient.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      })

      // 結果の確認
      expect(result).toBe(false)
    })
  })
})
