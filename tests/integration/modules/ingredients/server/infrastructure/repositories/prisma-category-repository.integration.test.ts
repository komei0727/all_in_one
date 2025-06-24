import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { CategoryBuilder } from '../../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

describe('PrismaCategoryRepository Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('カテゴリーのCRUD操作', () => {
    it('カテゴリーを作成できる', async () => {
      // Given: ユニークなカテゴリーデータ
      const uniqueName = `テストカテゴリー_${faker.string.alphanumeric(8)}`
      const categoryBuilder = new CategoryBuilder().withName(uniqueName).withRandomDisplayOrder()
      const categoryData = categoryBuilder.build()

      // When: 新しいカテゴリーを作成
      const newCategory = await prisma.category.create({
        data: {
          id: categoryData.getId(),
          name: categoryData.getName(),
          displayOrder: categoryData.getDisplayOrder(),
        },
      })

      // Then: カテゴリーが作成されている
      expect(newCategory).toBeDefined()
      expect(newCategory.name).toBe(categoryData.getName())
      expect(newCategory.displayOrder).toBe(categoryData.getDisplayOrder())
    })

    it('IDでカテゴリーを取得できる', async () => {
      // When: IDでカテゴリーを検索
      const category = await prisma.category.findUnique({
        where: { id: 'cat00001' },
      })

      // Then: カテゴリーが取得できる
      expect(category).toBeDefined()
      expect(category?.name).toBe('野菜')
      expect(category?.displayOrder).toBe(1)
    })

    it('アクティブなカテゴリーを取得できる', async () => {
      // Given: 1つのカテゴリーを非アクティブに
      await prisma.category.update({
        where: { id: 'cat00002' },
        data: { isActive: false },
      })

      // When: アクティブなカテゴリーを取得
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      })

      // Then: アクティブなカテゴリーのみ取得される
      expect(categories).toHaveLength(2)
      expect(categories.find((c) => c.id === 'cat00002')).toBeUndefined()
    })

    it('カテゴリーを更新できる', async () => {
      // Given: 更新後のユニークな名前を準備
      const uniqueName = `更新テストカテゴリー_${faker.string.alphanumeric(8)}`
      const updatedCategory = new CategoryBuilder().withName(uniqueName).build()
      const updatedName = updatedCategory.getName()

      // When: カテゴリー名を更新
      const updated = await prisma.category.update({
        where: { id: 'cat00001' },
        data: { name: updatedName },
      })

      // Then: カテゴリーが更新されている
      expect(updated.name).toBe(updatedName)
    })

    it('カテゴリーを削除できる', async () => {
      // When: カテゴリーを削除
      await prisma.category.delete({
        where: { id: 'cat00003' },
      })

      // Then: カテゴリーが削除されている
      const deleted = await prisma.category.findUnique({
        where: { id: 'cat00003' },
      })
      expect(deleted).toBeNull()
    })
  })

  describe('データベース接続の確認', () => {
    it('Prismaクライアントが正しく動作する', async () => {
      // When: データベースに直接クエリ
      const count = await prisma.category.count()

      // Then: 3つのカテゴリーが存在する
      expect(count).toBe(3)
    })

    it('トランザクションが正しく動作する', async () => {
      // Given: ランダムなカテゴリーデータ
      const newCategoryId = faker.string.uuid()
      const newCategoryName = faker.commerce.department()
      const newDisplayOrder = faker.number.int({ min: 10, max: 99 })

      // When: トランザクション内で新しいカテゴリーを作成
      const newCategory = await prisma.$transaction(async (tx) => {
        return await tx.category.create({
          data: {
            id: newCategoryId,
            name: newCategoryName,
            displayOrder: newDisplayOrder,
          },
        })
      })

      // Then: カテゴリーが作成されている
      expect(newCategory).toBeDefined()
      expect(newCategory.name).toBe(newCategoryName)

      // And: データベースに保存されている
      const saved = await prisma.category.findUnique({
        where: { id: newCategoryId },
      })
      expect(saved).toBeDefined()
    })
  })
})
