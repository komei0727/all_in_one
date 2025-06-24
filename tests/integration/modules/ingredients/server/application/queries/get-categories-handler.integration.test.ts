/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories.handler'
import { GetCategoriesQuery } from '@/modules/ingredients/server/application/queries/get-categories.query'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'

import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

/**
 * GetCategoriesHandler統合テスト
 *
 * カテゴリー一覧取得機能をデータベースとの統合で検証
 */
describe('GetCategoriesHandler Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let handler: GetCategoriesQueryHandler
  let repository: PrismaCategoryRepository

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // リポジトリとハンドラーの初期化
    repository = new PrismaCategoryRepository(prisma as any)
    handler = new GetCategoriesQueryHandler(repository)
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    it('アクティブなカテゴリー一覧を取得できる', async () => {
      // Given: クエリを作成
      const query = new GetCategoriesQuery()

      // When: ハンドラーを実行
      const result = await handler.handle(query)

      // Then: シードデータの3カテゴリーが表示順で取得される
      expect(result.categories).toHaveLength(3)
      expect(result.categories[0].id).toBe('cat00001')
      expect(result.categories[0].name).toBe('野菜')
      expect(result.categories[0].displayOrder).toBe(1)
      expect(result.categories[1].id).toBe('cat00002')
      expect(result.categories[1].name).toBe('肉・魚')
      expect(result.categories[1].displayOrder).toBe(2)
      expect(result.categories[2].id).toBe('cat00003')
      expect(result.categories[2].name).toBe('調味料')
      expect(result.categories[2].displayOrder).toBe(3)
    })

    it('非アクティブなカテゴリーは取得されない', async () => {
      // Given: 1つのカテゴリーを非アクティブにする
      await prisma.category.update({
        where: { id: 'cat00002' },
        data: { isActive: false },
      })

      // When: カテゴリー一覧を取得
      const result = await handler.handle(new GetCategoriesQuery())

      // Then: アクティブなカテゴリーのみ取得される
      expect(result.categories).toHaveLength(2)
      expect(result.categories.find((c: any) => c.id === 'cat00002')).toBeUndefined()
      expect(result.categories[0].id).toBe('cat00001')
      expect(result.categories[1].id).toBe('cat00003')
    })

    it('新しいカテゴリーを追加しても表示順で取得される', async () => {
      // Given: 新しいカテゴリーを追加
      const newCategoryId = faker.string.uuid()
      const newCategoryName = `テストカテゴリー_${faker.string.alphanumeric(6)}`
      await prisma.category.create({
        data: {
          id: newCategoryId,
          name: newCategoryName,
          displayOrder: 0, // 最初に表示
          isActive: true,
        },
      })

      // When: カテゴリー一覧を取得
      const result = await handler.handle(new GetCategoriesQuery())

      // Then: 4つのカテゴリーが表示順で取得される
      expect(result.categories).toHaveLength(4)
      expect(result.categories[0].id).toBe(newCategoryId)
      expect(result.categories[0].name).toBe(newCategoryName)
      expect(result.categories[0].displayOrder).toBe(0)
      expect(result.categories[1].id).toBe('cat00001')
      expect(result.categories[2].id).toBe('cat00002')
      expect(result.categories[3].id).toBe('cat00003')
    })

    it('カテゴリーが0件の場合は空配列を返す', async () => {
      // Given: すべてのカテゴリーを削除
      await prisma.category.deleteMany()

      // When: カテゴリー一覧を取得
      const result = await handler.handle(new GetCategoriesQuery())

      // Then: 空配列が返される
      expect(result.categories).toEqual([])
    })

    it('同じ表示順のカテゴリーも正しく取得できる', async () => {
      // Given: 同じ表示順のカテゴリーを複数追加
      const sameOrder = 999
      const categoryIds = []
      for (let i = 0; i < 3; i++) {
        const id = faker.string.uuid()
        categoryIds.push(id)
        await prisma.category.create({
          data: {
            id,
            name: `同順カテゴリー${i}_${faker.string.alphanumeric(4)}`,
            displayOrder: sameOrder,
            isActive: true,
          },
        })
      }

      // When: カテゴリー一覧を取得
      const result = await handler.handle(new GetCategoriesQuery())

      // Then: すべてのカテゴリーが取得される（シード3 + 新規3）
      expect(result.categories).toHaveLength(6)

      // 同じ表示順のカテゴリーが存在することを確認
      const sameOrderCategories = result.categories.filter((c: any) => c.displayOrder === sameOrder)
      expect(sameOrderCategories).toHaveLength(3)

      // 作成したカテゴリーがすべて含まれていることを確認
      categoryIds.forEach((id) => {
        expect(result.categories.find((c: any) => c.id === id)).toBeDefined()
      })
    })
  })

  describe('パフォーマンス', () => {
    it('大量のカテゴリーがあっても高速に取得できる', async () => {
      // Given: 100個のカテゴリーを追加
      const categories = Array.from({ length: 100 }, (_, i) => ({
        id: faker.string.uuid(),
        name: `カテゴリー${i}_${faker.string.alphanumeric(4)}`,
        displayOrder: 100 + i,
        isActive: true,
      }))

      await prisma.category.createMany({
        data: categories,
      })

      // When: カテゴリー一覧を取得（時間計測）
      const startTime = performance.now()
      const result = await handler.handle(new GetCategoriesQuery())
      const endTime = performance.now()

      // Then: 103個のカテゴリーが取得される
      expect(result.categories).toHaveLength(103) // シード3 + 新規100

      // パフォーマンスチェック（1秒以内）
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })

  describe('データ整合性', () => {
    it('並行してクエリを実行しても正しい結果を返す', async () => {
      // Given: クエリを作成
      const query = new GetCategoriesQuery()

      // When: 並行して複数回実行
      const promises = Array.from({ length: 5 }, () => handler.handle(query))
      const results = await Promise.all(promises)

      // Then: すべて同じ結果を返す
      expect(results).toHaveLength(5)
      results.forEach((result) => {
        expect(result.categories).toHaveLength(3)
        expect(result.categories[0].id).toBe('cat00001')
        expect(result.categories[1].id).toBe('cat00002')
        expect(result.categories[2].id).toBe('cat00003')
      })
    })

    it('カテゴリー更新中でも一貫性のあるデータを返す', async () => {
      // Given: カテゴリー一覧を取得
      const initialResult = await handler.handle(new GetCategoriesQuery())
      expect(initialResult.categories).toHaveLength(3)

      // When: カテゴリーを更新しながら並行してクエリを実行
      const updatePromise = prisma.category.update({
        where: { id: 'cat00001' },
        data: { name: `更新_${faker.string.alphanumeric(6)}` },
      })

      const queryPromise = handler.handle(new GetCategoriesQuery())

      const [_, result] = await Promise.all([updatePromise, queryPromise])

      // Then: カテゴリー数は変わらない
      expect(result.categories).toHaveLength(3)
      expect(result.categories.map((c: any) => c.id).sort()).toEqual([
        'cat00001',
        'cat00002',
        'cat00003',
      ])
    })
  })
})
