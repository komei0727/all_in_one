import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
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
      // When: 新しいカテゴリーを作成
      const newCategory = await prisma.category.create({
        data: {
          id: 'new-cat',
          name: '新カテゴリー',
          displayOrder: 10,
        },
      })

      // Then: カテゴリーが作成されている
      expect(newCategory).toBeDefined()
      expect(newCategory.name).toBe('新カテゴリー')
      expect(newCategory.displayOrder).toBe(10)
    })

    it('IDでカテゴリーを取得できる', async () => {
      // When: IDでカテゴリーを検索
      const category = await prisma.category.findUnique({
        where: { id: 'cat1' },
      })

      // Then: カテゴリーが取得できる
      expect(category).toBeDefined()
      expect(category?.name).toBe('野菜')
      expect(category?.displayOrder).toBe(1)
    })

    it('アクティブなカテゴリーを取得できる', async () => {
      // Given: 1つのカテゴリーを非アクティブに
      await prisma.category.update({
        where: { id: 'cat2' },
        data: { isActive: false },
      })

      // When: アクティブなカテゴリーを取得
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      })

      // Then: アクティブなカテゴリーのみ取得される
      expect(categories).toHaveLength(2)
      expect(categories.find((c) => c.id === 'cat2')).toBeUndefined()
    })

    it('カテゴリーを更新できる', async () => {
      // When: カテゴリー名を更新
      const updated = await prisma.category.update({
        where: { id: 'cat1' },
        data: { name: '更新された野菜' },
      })

      // Then: カテゴリーが更新されている
      expect(updated.name).toBe('更新された野菜')
    })

    it('カテゴリーを削除できる', async () => {
      // When: カテゴリーを削除
      await prisma.category.delete({
        where: { id: 'cat3' },
      })

      // Then: カテゴリーが削除されている
      const deleted = await prisma.category.findUnique({
        where: { id: 'cat3' },
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
      // Given: トランザクション内で新しいカテゴリーを作成
      const newCategory = await prisma.$transaction(async (tx) => {
        return await tx.category.create({
          data: {
            id: 'cat-new',
            name: '新カテゴリー',
            displayOrder: 4,
          },
        })
      })

      // Then: カテゴリーが作成されている
      expect(newCategory).toBeDefined()
      expect(newCategory.name).toBe('新カテゴリー')

      // And: データベースに保存されている
      const saved = await prisma.category.findUnique({
        where: { id: 'cat-new' },
      })
      expect(saved).toBeDefined()
    })
  })
})
