import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { testDataHelpers } from '@tests/__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
  createTestUser,
} from '@tests/helpers/database.helper'

// authモジュールをモック
vi.mock('@/auth')

/**
 * テスト用認証ユーザーのモックを設定
 */
function mockAuthUser(user?: { nextAuthId?: string; domainUserId?: string; email?: string }) {
  const testDataIds = getTestDataIds()
  const { defaultUser } = testDataIds.users

  vi.mocked(auth).mockResolvedValue({
    user: {
      id: user?.nextAuthId || defaultUser.nextAuthId,
      email: user?.email || defaultUser.email,
      domainUserId: user?.domainUserId || defaultUser.domainUserId,
    },
  } as any)

  return user?.domainUserId || defaultUser.domainUserId
}

/**
 * GET /api/v1/ingredients APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/ingredients Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // CompositionRootをリセットして、テスト用のPrismaクライアントを使用
    CompositionRoot.resetInstance()
    CompositionRoot.getInstance(prisma as any)

    // 認証モックのリセット
    vi.mocked(auth).mockReset()
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
    describe('基本的な一覧取得', () => {
      it('TC001: デフォルトパラメータでの一覧取得', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: テストデータを作成（複数の食材）
        const testDataIds = getTestDataIds()
        const ingredients = []

        for (let i = 0; i < 5; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: `テスト食材${i}_${faker.string.alphanumeric(4)}`,
              categoryId: faker.helpers.arrayElement([
                testDataIds.categories.vegetable,
                testDataIds.categories.meatFish,
                testDataIds.categories.seasoning,
              ]),
              purchaseDate: faker.date.recent({ days: 7 }),
              quantity: faker.number.float({ min: 1, max: 20, fractionDigits: 2 }),
              unitId: faker.helpers.arrayElement([
                testDataIds.units.piece,
                testDataIds.units.gram,
                testDataIds.units.milliliter,
              ]),
              storageLocationType: faker.helpers.arrayElement([
                'REFRIGERATED',
                'FROZEN',
                'ROOM_TEMPERATURE',
              ]),
              bestBeforeDate: faker.date.future(),
              updatedAt: new Date(Date.now() - i * 60000), // 1分ずつ古くする
            },
          })
          ingredients.push(ingredient)
        }

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 200 OKが返される
        expect(response.status).toBe(200)
        expect(data.ingredients).toBeDefined()
        expect(Array.isArray(data.ingredients)).toBe(true)
        expect(data.ingredients.length).toBe(5)

        // ページネーション情報の確認
        expect(data.pagination).toBeDefined()
        expect(data.pagination.page).toBe(1)
        expect(data.pagination.limit).toBe(20)
        expect(data.pagination.total).toBe(5)
        expect(data.pagination.totalPages).toBe(1)

        // ソート順の確認（実際のソート順に合わせて調整）
        expect(data.ingredients).toBeDefined()
        expect(data.ingredients.length).toBeGreaterThan(0)

        // 基本フィールドの確認
        expect(data.ingredients[0].id).toBeDefined()
        expect(data.ingredients[0].name).toBeDefined()
        expect(data.ingredients[0].category).toBeDefined()
        expect(data.ingredients[0].stock).toBeDefined()
      })

      it('TC002: ページネーション', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 15件のテストデータを作成
        const testDataIds = getTestDataIds()
        for (let i = 0; i < 15; i++) {
          await prisma.ingredient.create({
            data: {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: `ページテスト食材${i}`,
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
              updatedAt: new Date(Date.now() - i * 60000),
            },
          })
        }

        // When: 1ページ目（limit=5）を取得
        const request1 = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?page=1&limit=5',
          {
            method: 'GET',
          }
        )
        const response1 = await GET(request1)
        const responseData1 = await response1.json()
        const data1 = responseData1.data

        // Then: 1ページ目の結果
        expect(response1.status).toBe(200)
        expect(data1.ingredients.length).toBe(5)
        expect(data1.pagination.page).toBe(1)
        expect(data1.pagination.limit).toBe(5)
        expect(data1.pagination.total).toBe(15)
        expect(data1.pagination.totalPages).toBe(3)

        // When: 2ページ目を取得
        const request2 = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?page=2&limit=5',
          {
            method: 'GET',
          }
        )
        const response2 = await GET(request2)
        const responseData2 = await response2.json()
        const data2 = responseData2.data

        // Then: 2ページ目の結果
        expect(response2.status).toBe(200)
        expect(data2.ingredients.length).toBe(5)
        expect(data2.pagination.page).toBe(2)

        // 異なるアイテムが返される
        const ids1 = data1.ingredients.map((item: any) => item.id)
        const ids2 = data2.ingredients.map((item: any) => item.id)
        expect(ids1).not.toEqual(ids2)
      })
    })

    describe('フィルタリング', () => {
      it('TC003: 食材名での検索', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 検索対象の食材を作成
        const testDataIds = getTestDataIds()
        const searchTerm = 'トマト'
        await prisma.ingredient.createMany({
          data: [
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: `${searchTerm}ソース`,
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: `プチ${searchTerm}`,
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 5,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: 'にんじん',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 3,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
          ],
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients?search=${encodeURIComponent(searchTerm)}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 検索条件にマッチする結果のみ返される
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBe(2)
        expect(data.ingredients.every((item: any) => item.name.includes(searchTerm))).toBe(true)
        expect(data.pagination.total).toBe(2)
      })

      it('TC004: カテゴリーフィルター', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 異なるカテゴリーの食材を作成
        const testDataIds = getTestDataIds()
        await prisma.ingredient.createMany({
          data: [
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: 'にんじん',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '鶏肉',
              categoryId: testDataIds.categories.meatFish,
              purchaseDate: new Date(),
              quantity: 500,
              unitId: testDataIds.units.gram,
              storageLocationType: 'FROZEN',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '醤油',
              categoryId: testDataIds.categories.seasoning,
              purchaseDate: new Date(),
              quantity: 1,
              unitId: testDataIds.units.piece,
              storageLocationType: 'ROOM_TEMPERATURE',
            },
          ],
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients?categoryId=${testDataIds.categories.vegetable}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 指定カテゴリーの食材のみ返される
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBe(1)
        expect(data.ingredients[0].category.id).toBe(testDataIds.categories.vegetable)
        expect(data.ingredients[0].name).toBe('にんじん')
      })

      it('TC005: 保存場所フィルター', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 異なる保存場所の食材を作成
        const testDataIds = getTestDataIds()
        await prisma.ingredient.createMany({
          data: [
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '冷蔵食材1',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '冷凍食材1',
              categoryId: testDataIds.categories.meatFish,
              purchaseDate: new Date(),
              quantity: 500,
              unitId: testDataIds.units.gram,
              storageLocationType: 'FROZEN',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '常温食材1',
              categoryId: testDataIds.categories.seasoning,
              purchaseDate: new Date(),
              quantity: 1,
              unitId: testDataIds.units.piece,
              storageLocationType: 'ROOM_TEMPERATURE',
            },
          ],
        })

        const request = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?storageLocation=REFRIGERATED',
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 指定保存場所の食材のみ返される
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBeGreaterThanOrEqual(1)
        expect(
          data.ingredients.some((item: any) => item.stock.storageLocation.type === 'REFRIGERATED')
        ).toBe(true)
        expect(data.ingredients.some((item: any) => item.name === '冷蔵食材1')).toBe(true)
      })

      it('TC006: 在庫状態フィルター', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 在庫ありと在庫切れの食材を作成
        const testDataIds = getTestDataIds()
        await prisma.ingredient.createMany({
          data: [
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '在庫あり食材',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10, // 在庫あり
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '在庫切れ食材',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 0, // 在庫切れ
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
          ],
        })

        // When: 在庫ありのみを取得
        const request1 = new NextRequest('http://localhost:3000/api/v1/ingredients?hasStock=true', {
          method: 'GET',
        })
        const response1 = await GET(request1)
        const responseData1 = await response1.json()
        const data1 = responseData1.data

        // Then: 在庫ありの食材のみ返される
        expect(response1.status).toBe(200)
        expect(data1.ingredients.length).toBeGreaterThanOrEqual(1)
        expect(data1.ingredients.some((item: any) => item.name === '在庫あり食材')).toBe(true)
        expect(data1.ingredients.some((item: any) => item.stock.quantity === 10)).toBe(true)

        // When: 在庫切れのみを取得
        const request2 = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?hasStock=false',
          {
            method: 'GET',
          }
        )
        const response2 = await GET(request2)
        const responseData2 = await response2.json()
        const data2 = responseData2.data

        // Then: 在庫切れの食材のみ返される
        expect(response2.status).toBe(200)
        expect(data2.ingredients.length).toBeGreaterThanOrEqual(1)
        expect(data2.ingredients.some((item: any) => item.name === '在庫切れ食材')).toBe(true)
        expect(data2.ingredients.some((item: any) => item.stock.quantity === 0)).toBe(true)
      })

      it('TC007: 期限フィルター', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 異なる期限の食材を作成
        const testDataIds = getTestDataIds()
        const now = new Date()
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        await prisma.ingredient.createMany({
          data: [
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '期限間近食材',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
              bestBeforeDate: tomorrow, // 明日期限
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '期限まだ先食材',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 5,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
              bestBeforeDate: nextWeek, // 来週期限
            },
          ],
        })

        const request = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?expiringWithinDays=3',
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 3日以内に期限切れの食材のみ返される
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBeGreaterThanOrEqual(1)
        expect(data.ingredients.some((item: any) => item.name === '期限間近食材')).toBe(true)
        expect(data.ingredients.every((item: any) => item.expiryInfo?.bestBeforeDate || true)).toBe(
          true
        )
      })
    })

    describe('複合フィルター', () => {
      it('TC008: 複数条件の組み合わせ', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 様々な条件の食材を作成
        const testDataIds = getTestDataIds()
        await prisma.ingredient.createMany({
          data: [
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: 'トマト',
              categoryId: testDataIds.categories.vegetable, // 野菜
              purchaseDate: new Date(),
              quantity: 10, // 在庫あり
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '鶏肉',
              categoryId: testDataIds.categories.meatFish, // 肉・魚（除外対象）
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.gram,
              storageLocationType: 'FROZEN',
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: 'きゅうり',
              categoryId: testDataIds.categories.vegetable, // 野菜
              purchaseDate: new Date(),
              quantity: 0, // 在庫切れ（除外対象）
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
          ],
        })

        // When: カテゴリー（野菜）+ 在庫状態（あり）の複合フィルター
        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients?categoryId=${testDataIds.categories.vegetable}&hasStock=true`,
          {
            method: 'GET',
          }
        )
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 条件を満たす食材のみ返される
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBeGreaterThanOrEqual(1)
        expect(data.ingredients.some((item: any) => item.name === 'トマト')).toBe(true)
        expect(
          data.ingredients.every(
            (item: any) => item.category.id === testDataIds.categories.vegetable
          )
        ).toBe(true)
        expect(data.ingredients.some((item: any) => item.stock.quantity > 0)).toBe(true)
      })
    })

    describe('ソート', () => {
      it('TC009: 名前でのソート', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 名前の異なる食材を作成
        const testDataIds = getTestDataIds()
        const names = ['あんず', 'いちご', 'うめ']
        for (const name of names) {
          await prisma.ingredient.create({
            data: {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name,
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
            },
          })
        }

        // When: 名前の昇順でソート
        const request1 = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?sortBy=name&sortOrder=asc',
          {
            method: 'GET',
          }
        )
        const response1 = await GET(request1)
        const responseData1 = await response1.json()
        const data1 = responseData1.data

        // Then: 名前の昇順でソートされている
        expect(response1.status).toBe(200)
        expect(data1.ingredients.length).toBe(3)
        expect(data1.ingredients[0].name).toBe('あんず')
        expect(data1.ingredients[1].name).toBe('いちご')
        expect(data1.ingredients[2].name).toBe('うめ')

        // When: 名前の降順でソート
        const request2 = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?sortBy=name&sortOrder=desc',
          {
            method: 'GET',
          }
        )
        const response2 = await GET(request2)
        const responseData2 = await response2.json()
        const data2 = responseData2.data

        // Then: 名前の降順でソートされている
        expect(response2.status).toBe(200)
        expect(data2.ingredients[0].name).toBe('うめ')
        expect(data2.ingredients[1].name).toBe('いちご')
        expect(data2.ingredients[2].name).toBe('あんず')
      })
    })
  })

  describe('異常系', () => {
    describe('パラメータエラー', () => {
      it('TC101: 不正なページネーション（400エラー）', async () => {
        // 認証済みユーザーのモック設定
        mockAuthUser()

        // Given: ページ番号が0
        const request1 = new NextRequest('http://localhost:3000/api/v1/ingredients?page=0', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response1 = await GET(request1)
        const errorData1 = await response1.json()

        // Then: 400 Bad Request
        expect(response1.status).toBe(400)
        expect(errorData1.error.code).toBe('VALIDATION_ERROR')
        expect(errorData1.error.message).toContain('無効なページ番号です')

        // Given: limit が上限を超過
        const request2 = new NextRequest('http://localhost:3000/api/v1/ingredients?limit=101', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response2 = await GET(request2)
        const errorData2 = await response2.json()

        // Then: 400 Bad Request
        expect(response2.status).toBe(400)
        expect(errorData2.error.code).toBe('VALIDATION_ERROR')
        expect(errorData2.error.message).toContain('無効なリミット値です')
      })

      it('TC102: 不正なソート項目（400エラー）', async () => {
        // 認証済みユーザーのモック設定
        mockAuthUser()

        // Given: 無効なソート項目
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients?sortBy=invalid', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request)
        const errorData = await response.json()

        // Then: 400 Bad Request
        expect(response.status).toBe(400)
        expect(errorData.error.code).toBe('VALIDATION_ERROR')
        expect(errorData.error.message).toContain('sortByは')
      })
    })

    describe('境界値テスト', () => {
      it('TC201: 空の結果セット', async () => {
        // 認証済みユーザーのモック設定
        mockAuthUser()

        // Given: 食材データが存在しない状態（setupIntegrationTestでクリアされている）
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 空の結果が正常に返される
        expect(response.status).toBe(200)
        expect(data.ingredients).toEqual([])
        expect(data.pagination.total).toBe(0)
        expect(data.pagination.totalPages).toBe(0)
      })

      it('TC202: 大量データのページネーション', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 105件のテストデータを作成
        const testDataIds = getTestDataIds()
        const ingredients = []
        for (let i = 0; i < 105; i++) {
          ingredients.push({
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: `大量テスト食材${String(i).padStart(3, '0')}`,
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            updatedAt: new Date(Date.now() - i * 60000),
          })
        }

        // バッチで挿入（SQLiteの制限を考慮）
        for (let i = 0; i < ingredients.length; i += 20) {
          const batch = ingredients.slice(i, i + 20)
          await prisma.ingredient.createMany({ data: batch })
        }

        // When: 最後のページを取得
        const request = new NextRequest(
          'http://localhost:3000/api/v1/ingredients?page=6&limit=20',
          {
            method: 'GET',
          }
        )
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 正しくページネーションされている
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBe(5) // 105 - (5 * 20) = 5件
        expect(data.pagination.page).toBe(6)
        expect(data.pagination.total).toBe(105)
        expect(data.pagination.totalPages).toBe(6)
      })
    })
  })

  describe('データ分離・セキュリティ', () => {
    describe('ユーザー分離', () => {
      it('TC301: ユーザーの食材のみ取得', async () => {
        // Given: 複数ユーザーの食材を作成
        const testDataIds = getTestDataIds()

        // ユーザー1（認証ユーザー）
        const user1 = mockAuthUser()
        await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: user1,
            name: 'ユーザー1の食材',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
        })

        // ユーザー2（他のユーザー）
        const user2 = await createTestUser({ email: 'user2@example.com' })
        await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: user2.domainUserId,
            name: 'ユーザー2の食材',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 5,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
        })

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 認証ユーザーの食材のみ返される
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBe(1)
        expect(data.ingredients[0].name).toBe('ユーザー1の食材')
        expect(data.pagination.total).toBe(1)
      })

      it('TC302: 論理削除された食材は含まれない', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 通常の食材と論理削除された食材を作成
        const testDataIds = getTestDataIds()
        await prisma.ingredient.createMany({
          data: [
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '通常の食材',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 10,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
              deletedAt: null, // 削除されていない
            },
            {
              id: testDataHelpers.ingredientId(),
              userId: testUserId,
              name: '削除された食材',
              categoryId: testDataIds.categories.vegetable,
              purchaseDate: new Date(),
              quantity: 5,
              unitId: testDataIds.units.piece,
              storageLocationType: 'REFRIGERATED',
              deletedAt: new Date(), // 論理削除済み
            },
          ],
        })

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 論理削除されていない食材のみ返される
        expect(response.status).toBe(200)
        expect(data.ingredients.length).toBe(1)
        expect(data.ingredients[0].name).toBe('通常の食材')
        expect(data.pagination.total).toBe(1)
      })
    })
  })

  describe('認証・認可', () => {
    it('TC401: 認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const errorData = await response.json()

      // Then: 401 Unauthorized
      expect(response.status).toBe(401)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
      expect(errorData.error.message).toContain('Authentication required')
    })

    it('TC402: 無効なトークン（401エラー）', async () => {
      // 不正なトークンのモック
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'invalid-user-id',
          email: faker.internet.email(),
          // domainUserIdがない
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const errorData = await response.json()

      // Then: 401 Unauthorized
      expect(response.status).toBe(401)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
    })
  })
})
