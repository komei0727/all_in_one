import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/[id]/route'
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
 * GET /api/v1/ingredients/[id] APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/ingredients/[id] Integration Tests', () => {
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
    describe('基本的な詳細取得', () => {
      it('TC001: 存在する食材の詳細取得', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: テストデータを作成
        const testDataIds = getTestDataIds()
        const ingredientName = faker.food.ingredient()
        const ingredientMemo = faker.lorem.sentence()
        const stockQuantity = faker.number.float({ min: 1, max: 20, fractionDigits: 2 })
        const price = faker.number.float({ min: 100, max: 1000, fractionDigits: 2 })
        const purchaseDate = faker.date.recent({ days: 7 })
        const bestBeforeDate = faker.date.future()

        const ingredientId = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: ingredientName,
            categoryId: testDataIds.categories.vegetable,
            memo: ingredientMemo,
            price,
            purchaseDate,
            quantity: stockQuantity,
            unitId: testDataIds.units.piece,
            threshold: 5,
            storageLocationType: 'REFRIGERATED',
            storageLocationDetail: '野菜室',
            bestBeforeDate,
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${ingredientId.id}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: ingredientId.id }) })
        const responseData = await response.json()
        const data = responseData.data

        // Then: 200 OKが返される
        expect(response.status).toBe(200)
        expect(data.ingredient).toBeDefined()
        expect(data.ingredient.id).toBe(ingredientId.id)
        expect(data.ingredient.name).toBe(ingredientName)
        expect(data.ingredient.memo).toBe(ingredientMemo)
        expect(data.ingredient.price).toBe(price)
        expect(data.ingredient.stock.quantity).toBe(stockQuantity)
        expect(data.ingredient.stock.unit.id).toBe(testDataIds.units.piece)
        expect(data.ingredient.stock.storageLocation.type).toBe('REFRIGERATED')
        expect(data.ingredient.stock.storageLocation.detail).toBe('野菜室')
        expect(data.ingredient.category.id).toBe(testDataIds.categories.vegetable)
        expect(data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        expect(data.ingredient.createdAt).toBeDefined()
        expect(data.ingredient.updatedAt).toBeDefined()
      })

      it('TC002: 期限なし食材の取得', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 期限情報がない食材
        const testDataIds = getTestDataIds()
        const ingredientId = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: faker.food.ingredient(),
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            // bestBeforeDate, useByDateは設定しない
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${ingredientId.id}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: ingredientId.id }) })
        const responseData = await response.json()
        const data = responseData.data

        // Then: expiryInfoがnull
        expect(response.status).toBe(200)
        expect(data.ingredient.expiryInfo).toBeNull()
      })

      it('TC003: 全フィールドが設定された食材の取得', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 全フィールドが設定された食材
        const testDataIds = getTestDataIds()
        const precisePrice = faker.number.float({ min: 100, max: 1000, fractionDigits: 2 })
        const bestBeforeDate = faker.date.future({ years: 1 })
        const useByDate = faker.date.future({ years: 1 })

        const ingredientId = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: faker.food.ingredient(),
            categoryId: testDataIds.categories.vegetable,
            memo: faker.lorem.sentence(),
            price: precisePrice,
            purchaseDate: new Date(),
            quantity: 15.5,
            unitId: testDataIds.units.gram,
            threshold: 10,
            storageLocationType: 'FROZEN',
            storageLocationDetail: '冷凍庫上段',
            bestBeforeDate,
            useByDate,
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${ingredientId.id}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: ingredientId.id }) })
        const responseData = await response.json()
        const data = responseData.data

        // Then: 全フィールドが正しく返される
        expect(response.status).toBe(200)
        expect(data.ingredient.memo).toBeDefined()
        expect(data.ingredient.price).toBe(precisePrice)
        expect(data.ingredient.stock.quantity).toBe(15.5)
        expect(data.ingredient.stock.unit.symbol).toBe('g')
        expect(data.ingredient.stock.storageLocation.type).toBe('FROZEN')
        expect(data.ingredient.stock.storageLocation.detail).toBe('冷凍庫上段')
        expect(data.ingredient.expiryInfo).toBeDefined()
        expect(data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        expect(data.ingredient.expiryInfo.useByDate).toBeDefined()
      })
    })

    describe('計算フィールドの検証', () => {
      it('TC004: 期限ステータスの計算確認 - 新鮮な食材', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 7日後に期限切れの食材（新鮮）
        const testDataIds = getTestDataIds()
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 7)

        const ingredientId = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: faker.food.ingredient(),
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: futureDate,
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${ingredientId.id}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: ingredientId.id }) })
        const responseData = await response.json()
        const data = responseData.data

        // Then: 期限情報が存在し、将来の日付である
        expect(response.status).toBe(200)
        expect(data.ingredient.expiryInfo).toBeDefined()
        expect(data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        // 実際の期限が7日後に設定されていることを確認
        const bestBeforeDate = new Date(data.ingredient.expiryInfo.bestBeforeDate)
        const now = new Date()
        const diffDays = Math.ceil(
          (bestBeforeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        expect(diffDays).toBeGreaterThan(5)
      })

      it('TC005: 在庫ステータスの計算確認', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 在庫切れの食材
        const testDataIds = getTestDataIds()
        const ingredientId = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: faker.food.ingredient(),
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 0, // 在庫切れ
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${ingredientId.id}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: ingredientId.id }) })
        const responseData = await response.json()
        const data = responseData.data

        // Then: 在庫切れ状態
        expect(response.status).toBe(200)
        expect(data.ingredient.stock.quantity).toBe(0)
      })
    })
  })

  describe('異常系', () => {
    describe('リソース不存在', () => {
      it('TC101: 存在しない食材ID（404エラー）', async () => {
        // 認証済みユーザーのモック設定
        mockAuthUser()

        // Given: 存在しない食材ID
        const nonExistentId = testDataHelpers.ingredientId()
        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${nonExistentId}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: nonExistentId }) })
        const errorData = await response.json()

        // Then: 404 Not Foundが返される
        expect(response.status).toBe(404)
        expect(errorData.error.code).toBe('RESOURCE_NOT_FOUND')
      })

      it('TC102: 他ユーザーの食材（404エラー）', async () => {
        // Given: 他のユーザーを作成
        const otherUser = await createTestUser({ email: 'other@example.com' })

        // 他ユーザーの食材を作成
        const testDataIds = getTestDataIds()
        const otherUserIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: otherUser.domainUserId,
            name: faker.food.ingredient(),
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
        })

        // 現在のユーザーでアクセス
        mockAuthUser()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${otherUserIngredient.id}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, {
          params: Promise.resolve({ id: otherUserIngredient.id }),
        })
        const errorData = await response.json()

        // Then: 404 Not Found（プライバシー保護のため403ではなく404）
        expect(response.status).toBe(404)
        expect(errorData.error.code).toBe('RESOURCE_NOT_FOUND')
      })

      it('TC103: 論理削除された食材（404エラー）', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 論理削除された食材
        const testDataIds = getTestDataIds()
        const deletedIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: faker.food.ingredient(),
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            deletedAt: new Date(), // 論理削除
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${deletedIngredient.id}`,
          {
            method: 'GET',
          }
        )

        // When: APIを呼び出す
        const response = await GET(request, {
          params: Promise.resolve({ id: deletedIngredient.id }),
        })
        const errorData = await response.json()

        // Then: 404 Not Found
        expect(response.status).toBe(404)
        expect(errorData.error.code).toBe('RESOURCE_NOT_FOUND')
      })
    })

    describe('不正なID形式', () => {
      it('TC201: 無効なID形式（400エラー）', async () => {
        // 認証済みユーザーのモック設定
        mockAuthUser()

        // Given: CUID形式ではない文字列
        const invalidId = 'invalid-id-format'
        const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${invalidId}`, {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: invalidId }) })
        const errorData = await response.json()

        // Then: 400 Bad Request
        expect(response.status).toBe(400)
        expect(errorData.error.code).toBe('VALIDATION_ERROR')
      })
    })
  })

  describe('認証・認可', () => {
    it('TC301: 認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      // Given: 有効な食材ID
      const validId = testDataHelpers.ingredientId()
      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${validId}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: validId }) })
      const errorData = await response.json()

      // Then: 401 Unauthorized
      expect(response.status).toBe(401)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
      expect(errorData.error.message).toContain('認証が必要です')
    })

    it('TC302: 無効なトークン（401エラー）', async () => {
      // 不正なトークンのモック
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'invalid-user-id',
          email: faker.internet.email(),
          // domainUserIdがない
        },
      } as any)

      // Given: 有効な食材ID
      const validId = testDataHelpers.ingredientId()
      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${validId}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: validId }) })
      const errorData = await response.json()

      // Then: 401 Unauthorized
      expect(response.status).toBe(401)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('データ整合性', () => {
    it('TC401: カテゴリー・単位情報の結合確認', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 食材データ
      const testDataIds = getTestDataIds()
      const ingredientId = await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId: testUserId,
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.meatFish,
          purchaseDate: new Date(),
          quantity: 500,
          unitId: testDataIds.units.gram,
          storageLocationType: 'FROZEN',
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/v1/ingredients/${ingredientId.id}`,
        {
          method: 'GET',
        }
      )

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredientId.id }) })
      const responseData = await response.json()
      const data = responseData.data

      // Then: 関連データが正しく結合されている
      expect(response.status).toBe(200)
      expect(data.ingredient.category.id).toBe(testDataIds.categories.meatFish)
      expect(data.ingredient.category.name).toBe('肉・魚')
      expect(data.ingredient.stock.unit.id).toBe(testDataIds.units.gram)
      expect(data.ingredient.stock.unit.name).toBe('グラム')
      expect(data.ingredient.stock.unit.symbol).toBe('g')
    })

    it('TC402: 小数点価格の精度確認', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 小数点を含む価格の食材
      const testDataIds = getTestDataIds()
      const precisePrice = 123.45
      const ingredientId = await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId: testUserId,
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          price: precisePrice,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: testDataIds.units.piece,
          storageLocationType: 'REFRIGERATED',
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/v1/ingredients/${ingredientId.id}`,
        {
          method: 'GET',
        }
      )

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredientId.id }) })
      const responseData = await response.json()
      const data = responseData.data

      // Then: 価格の精度が保持されている
      expect(response.status).toBe(200)
      expect(data.ingredient.price).toBe(precisePrice)
    })
  })
})
