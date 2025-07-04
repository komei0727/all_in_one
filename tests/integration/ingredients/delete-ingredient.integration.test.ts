import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { DELETE, GET } from '@/app/api/v1/ingredients/[id]/route'
import { POST } from '@/app/api/v1/ingredients/route'
import { auth } from '@/auth'
import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
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
 * DELETE /api/v1/ingredients/{id} APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('DELETE /api/v1/ingredients/{id} Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // IngredientsApiCompositionRootをリセットして、テスト用のPrismaクライアントを使用
    IngredientsApiCompositionRoot.resetInstance()
    IngredientsApiCompositionRoot.getInstance(prisma as any)

    // 認証モックのリセット
    vi.mocked(auth).mockReset()
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを閉じる
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    describe('基本的な削除', () => {
      it('TC001: 食材の論理削除', async () => {
        // Given: 認証ユーザーをモック
        mockAuthUser()
        const testDataIds = getTestDataIds()

        // 食材を作成
        const ingredientData = {
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: faker.number.int({ min: 1, max: 10 }),
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        const createRequest = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ingredientData),
        })

        const createResponse = await POST(createRequest)
        expect(createResponse.status).toBe(201)
        const createResult = await createResponse.json()
        const createdIngredient = createResult.data.ingredient // data.ingredientでアクセス

        // When: 食材を削除
        const deleteRequest = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${createdIngredient.id}`,
          {
            method: 'DELETE',
          }
        )

        const deleteResponse = await DELETE(deleteRequest, {
          params: Promise.resolve({ id: createdIngredient.id }),
        })

        // エラーの詳細を確認
        console.log('Delete response status:', deleteResponse.status)
        if (deleteResponse.status === 500) {
          try {
            const errorData = await deleteResponse.json()
            console.error('Delete 500 error:', JSON.stringify(errorData, null, 2))
          } catch (e) {
            console.error('Failed to parse error response:', e)
          }
        }

        // Then: レスポンスの確認
        expect(deleteResponse.status).toBe(204)
        expect(deleteResponse.body).toBeNull()

        // データベースで論理削除を確認
        const deletedIngredient = await prisma.ingredient.findUnique({
          where: { id: createdIngredient.id },
        })
        expect(deletedIngredient).not.toBeNull()
        expect(deletedIngredient?.deletedAt).not.toBeNull()
        expect(deletedIngredient?.deletedAt).toBeInstanceOf(Date)
      })

      it('TC002: 削除後の状態確認', async () => {
        // Given: 認証ユーザーをモック
        mockAuthUser()
        const testDataIds = getTestDataIds()

        // 食材を作成して削除
        const ingredientData = {
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: faker.number.int({ min: 1, max: 10 }),
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        const createRequest = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ingredientData),
        })

        const createResponse = await POST(createRequest)
        expect(createResponse.status).toBe(201)
        const createResult = await createResponse.json()
        const createdIngredient = createResult.data.ingredient

        // 削除実行
        const deleteRequest = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${createdIngredient.id}`,
          {
            method: 'DELETE',
          }
        )

        const deleteResponse = await DELETE(deleteRequest, {
          params: Promise.resolve({ id: createdIngredient.id }),
        })

        // 削除レスポンスの確認
        expect(deleteResponse.status).toBe(204)

        // When: 削除後に詳細取得を試みる
        const getDetailRequest = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${createdIngredient.id}`,
          {
            method: 'GET',
          }
        )

        const getDetailResponse = await GET(getDetailRequest, {
          params: Promise.resolve({ id: createdIngredient.id }),
        })

        // Then: 404エラーを確認
        expect(getDetailResponse.status).toBe(404)
        const errorData = await getDetailResponse.json()
        expect(errorData.error).toMatchObject({
          code: 'RESOURCE_NOT_FOUND',
          message: expect.stringContaining('not found'),
        })

        // 一覧取得で表示されないことを確認
        const getListRequest = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'GET',
        })

        const { GET: GETList } = await import('@/app/api/v1/ingredients/route')
        const getListResponse = await GETList(getListRequest)
        const listData = await getListResponse.json()

        // 削除した食材が含まれていないことを確認
        const deletedItem = listData.data.ingredients.find(
          (item: any) => item.id === createdIngredient.id
        )
        expect(deletedItem).toBeUndefined()

        // 物理的にはデータベースに残存することを確認
        const physicalData = await prisma.ingredient.findUnique({
          where: { id: createdIngredient.id },
        })
        expect(physicalData).not.toBeNull()
        expect(physicalData?.deletedAt).not.toBeNull()
      })
    })
  })

  describe('異常系', () => {
    describe('リソース不存在', () => {
      it('TC101: 存在しない食材ID（404エラー）', async () => {
        // Given: 認証ユーザーをモック
        mockAuthUser()

        // 存在しないID（CUID形式）
        const nonExistentId = testDataHelpers.ingredientId()

        // When: 削除を試みる
        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${nonExistentId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ id: nonExistentId }),
        })

        // Then: 404エラーを確認
        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toMatchObject({
          code: 'RESOURCE_NOT_FOUND',
          message: expect.stringContaining('not found'),
        })
      })

      it('TC102: 他ユーザーの食材（404エラー）', async () => {
        // Given: 他のユーザーを作成
        const otherUser = await createTestUser({ email: 'other@example.com' })
        const testDataIds = getTestDataIds()

        // 最初のユーザーとして食材を作成
        mockAuthUser({ domainUserId: otherUser.domainUserId })

        const ingredientData = {
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: faker.number.int({ min: 1, max: 10 }),
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        const createRequest = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ingredientData),
        })

        const createResponse = await POST(createRequest)
        expect(createResponse.status).toBe(201)
        const createResult = await createResponse.json()
        const createdIngredient = createResult.data.ingredient

        // デフォルトユーザーとして削除を試みる
        mockAuthUser()

        // When: 削除を試みる
        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${createdIngredient.id}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ id: createdIngredient.id }),
        })

        // Then: 404エラーを確認（プライバシー保護のため403ではなく404）
        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toMatchObject({
          code: 'RESOURCE_NOT_FOUND',
          message: expect.stringContaining('not found'),
        })
      })

      it('TC103: 既に削除済みの食材（404エラー）', async () => {
        // Given: 認証ユーザーをモック
        mockAuthUser()
        const testDataIds = getTestDataIds()

        // 食材を作成して削除
        const ingredientData = {
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: faker.number.int({ min: 1, max: 10 }),
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        const createRequest = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ingredientData),
        })

        const createResponse = await POST(createRequest)
        expect(createResponse.status).toBe(201)
        const createResult = await createResponse.json()
        const createdIngredient = createResult.data.ingredient

        // 最初の削除
        const firstDeleteRequest = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${createdIngredient.id}`,
          {
            method: 'DELETE',
          }
        )

        await DELETE(firstDeleteRequest, {
          params: Promise.resolve({ id: createdIngredient.id }),
        })

        // When: 再度削除を試みる
        const secondDeleteRequest = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${createdIngredient.id}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(secondDeleteRequest, {
          params: Promise.resolve({ id: createdIngredient.id }),
        })

        // Then: 404エラーを確認
        expect(response.status).toBe(404)
        const data = await response.json()
        expect(data.error).toMatchObject({
          code: 'RESOURCE_NOT_FOUND',
          message: expect.stringContaining('not found'),
        })
      })
    })
  })

  describe('データ整合性', () => {
    describe('履歴保持', () => {
      it('TC201: 削除後の履歴確認', async () => {
        // Given: 認証ユーザーをモック
        mockAuthUser()
        const testDataIds = getTestDataIds()

        // 食材を作成
        const ingredientData = {
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: 10,
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        const createRequest = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ingredientData),
        })

        const createResponse = await POST(createRequest)
        expect(createResponse.status).toBe(201)
        const createResult = await createResponse.json()
        const createdIngredient = createResult.data.ingredient

        // When: 食材を削除
        const deleteRequest = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${createdIngredient.id}`,
          {
            method: 'DELETE',
          }
        )

        await DELETE(deleteRequest, {
          params: Promise.resolve({ id: createdIngredient.id }),
        })

        // Then: データベースにデータが論理削除されていることを確認
        const deletedIngredient = await prisma.ingredient.findUnique({
          where: { id: createdIngredient.id },
        })
        expect(deletedIngredient).not.toBeNull()
        expect(deletedIngredient?.deletedAt).not.toBeNull()

        // TODO: イベント履歴の確認はDomainEventテーブルを使用する必要がある
      })
    })
  })
})
