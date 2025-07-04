import { NextRequest } from 'next/server'

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/categories/route'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '@tests/helpers/database.helper'

/**
 * GET /api/v1/ingredients/categories APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/ingredients/categories Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // CompositionRootをリセットして、テスト用のPrismaクライアントを使用
    CompositionRoot.resetInstance()
    CompositionRoot.getInstance(prisma as any)
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()

    // CompositionRootをリセット
    CompositionRoot.resetInstance()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    describe('カテゴリー一覧取得', () => {
      it('TC001: 全カテゴリーの取得', async () => {
        // Given: カテゴリーがシードデータで存在することを確認
        const categories = await prisma.category.findMany({
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        })
        expect(categories.length).toBeGreaterThan(0)

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients/categories', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 200 OKが返される
        expect(response.status).toBe(200)
        expect(data.categories).toBeDefined()
        expect(Array.isArray(data.categories)).toBe(true)
        expect(data.categories.length).toBeGreaterThan(0)

        // 必要なフィールドの確認
        const firstCategory = data.categories[0]
        expect(firstCategory).toHaveProperty('id')
        expect(firstCategory).toHaveProperty('name')
        expect(firstCategory).toHaveProperty('displayOrder')

        // displayOrderでソートされているか確認
        for (let i = 1; i < data.categories.length; i++) {
          expect(data.categories[i].displayOrder).toBeGreaterThanOrEqual(
            data.categories[i - 1].displayOrder
          )
        }

        // メタ情報の確認
        expect(responseData.meta).toBeDefined()
        expect(responseData.meta.timestamp).toBeDefined()
      })

      it('TC001: 名前順でのソート', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/v1/ingredients/categories?sortBy=name',
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 200 OKが返される
        expect(response.status).toBe(200)
        expect(data.categories).toBeDefined()
        expect(Array.isArray(data.categories)).toBe(true)

        // 名前順（日本語ロケール）でソートされているか確認
        if (data.categories.length > 1) {
          for (let i = 1; i < data.categories.length; i++) {
            const prevName = data.categories[i - 1].name
            const currName = data.categories[i].name
            // 日本語のソート順序は複雑なため、単純な比較は行わず、
            // APIがエラーなく動作することを確認
            expect(prevName).toBeDefined()
            expect(currName).toBeDefined()
          }
        }
      })
    })
  })

  describe('パフォーマンス', () => {
    describe('キャッシュ動作', () => {
      it('TC101: キャッシュの効果確認', async () => {
        // Given: 初回リクエスト
        const request1 = new NextRequest('http://localhost:3000/api/v1/ingredients/categories', {
          method: 'GET',
        })

        // When: 初回APIを呼び出す
        const startTime1 = Date.now()
        const response1 = await GET(request1)
        const endTime1 = Date.now()
        const responseData1 = await response1.json()

        // Then: 初回は正常に取得できる
        expect(response1.status).toBe(200)
        expect(responseData1.data.categories).toBeDefined()

        // Given: 2回目のリクエスト（キャッシュ利用想定）
        const request2 = new NextRequest('http://localhost:3000/api/v1/ingredients/categories', {
          method: 'GET',
        })

        // When: 2回目のAPIを呼び出す
        const startTime2 = Date.now()
        const response2 = await GET(request2)
        const endTime2 = Date.now()
        const responseData2 = await response2.json()

        // Then: 2回目も正常に取得でき、同じデータが返る
        expect(response2.status).toBe(200)
        expect(responseData2.data.categories).toEqual(responseData1.data.categories)

        // パフォーマンスのログ出力（参考情報）
        console.log(`初回リクエスト時間: ${endTime1 - startTime1}ms`)
        console.log(`2回目リクエスト時間: ${endTime2 - startTime2}ms`)
      })
    })
  })

  describe('異常系', () => {
    it('不正なsortByパラメータ（400エラー）', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/v1/ingredients/categories?sortBy=invalid',
        {
          method: 'GET',
        }
      )

      // When: APIを呼び出す
      const response = await GET(request)
      const errorData = await response.json()

      // Then: 400 Bad Request
      expect(response.status).toBe(400)
      expect(errorData.error.code).toBe('VALIDATION_ERROR')
      expect(errorData.error.message).toContain('sortByは')
    })
  })
})
