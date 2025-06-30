import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { CategoryId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '@tests/helpers/database.helper'

describe('PrismaCategoryRepository Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let repository: PrismaCategoryRepository

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()
    repository = new PrismaCategoryRepository(prisma as any)
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('findAllActive', () => {
    it('アクティブなカテゴリーを表示順で取得できる', async () => {
      // When: アクティブなカテゴリーを取得
      const categories = await repository.findAllActive()

      // Then: 3つのカテゴリーが表示順で取得される（シードデータ）
      expect(categories).toHaveLength(3)
      expect(categories[0].getName()).toBe('野菜')
      expect(categories[0].getDisplayOrder()).toBe(1)
      expect(categories[1].getName()).toBe('肉・魚')
      expect(categories[1].getDisplayOrder()).toBe(2)
      expect(categories[2].getName()).toBe('調味料')
      expect(categories[2].getDisplayOrder()).toBe(3)
    })

    it('非アクティブなカテゴリーは取得されない', async () => {
      // Given: 1つのカテゴリーを非アクティブに
      const testDataIds = getTestDataIds()
      await prisma.category.update({
        where: { id: testDataIds.categories.meatFish },
        data: { isActive: false },
      })

      // When: アクティブなカテゴリーを取得
      const categories = await repository.findAllActive()

      // Then: アクティブなカテゴリーのみ取得される
      expect(categories).toHaveLength(2)
      expect(categories.find((c) => c.getId() === testDataIds.categories.meatFish)).toBeUndefined()
    })

    it('表示順通りに取得される', async () => {
      // When: アクティブなカテゴリーを取得
      const categories = await repository.findAllActive()

      // Then: 表示順通りに並んでいる
      const displayOrders = categories.map((c) => c.getDisplayOrder())
      for (let i = 1; i < displayOrders.length; i++) {
        expect(displayOrders[i]).toBeGreaterThanOrEqual(displayOrders[i - 1])
      }
    })
  })

  describe('findById', () => {
    it('IDでカテゴリーを取得できる', async () => {
      // When: IDでカテゴリーを検索
      const testDataIds = getTestDataIds()
      const category = await repository.findById(new CategoryId(testDataIds.categories.vegetable))

      // Then: カテゴリーが取得できる
      expect(category).toBeDefined()
      expect(category?.getId()).toBe(testDataIds.categories.vegetable)
      expect(category?.getName()).toBe('野菜')
      expect(category?.getDisplayOrder()).toBe(1)
    })

    it('存在しないIDの場合nullを返す', async () => {
      // When: 存在しないIDで検索
      const nonExistentId = 'cat_999999999999999999999999' // 存在しないID（正しいフォーマット）
      const category = await repository.findById(new CategoryId(nonExistentId))

      // Then: nullが返される
      expect(category).toBeNull()
    })

    it('非アクティブなカテゴリーも取得できる', async () => {
      // Given: カテゴリーを非アクティブにする
      const testDataIds = getTestDataIds()
      await prisma.category.update({
        where: { id: testDataIds.categories.seasoning },
        data: { isActive: false },
      })

      // When: IDで検索
      const category = await repository.findById(new CategoryId(testDataIds.categories.seasoning))

      // Then: 非アクティブでも取得できる
      expect(category).toBeDefined()
      expect(category?.getId()).toBe(testDataIds.categories.seasoning)
      expect(category?.getName()).toBe('調味料')
    })
  })
})
