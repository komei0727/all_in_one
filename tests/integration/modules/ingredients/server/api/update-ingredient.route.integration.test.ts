import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { PUT } from '@/app/api/v1/ingredients/[id]/route'
import { auth } from '@/auth'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

import {
  CreateIngredientCommandBuilder,
  testDataHelpers,
} from '../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '../../../../../helpers/database.helper'

// @/auth はvitest configでモック済み

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
 * テスト用食材を作成
 */
async function createTestIngredient(
  userId: string,
  prisma: ReturnType<typeof getTestPrismaClient>
) {
  const testDataIds = getTestDataIds()
  const ingredientData = new CreateIngredientCommandBuilder()
    .withUserId(userId)
    .withCategoryId(testDataIds.categories.vegetable)
    .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
    .withStorageLocation({
      type: StorageType.REFRIGERATED,
      detail: '野菜室',
    })
    .withPurchaseDate(testDataHelpers.todayString())
    .withPrice(faker.number.int({ min: 100, max: 5000 }))
    .withBestBeforeDate(testDataHelpers.dateStringFromNow(faker.number.int({ min: 7, max: 30 })))
    .build()

  return await prisma.ingredient.create({
    data: {
      id: testDataHelpers.ingredientId(),
      userId: userId,
      name: ingredientData.name,
      categoryId: ingredientData.categoryId,
      memo: ingredientData.memo,
      price: ingredientData.price?.toString(),
      purchaseDate: new Date(ingredientData.purchaseDate),
      quantity: ingredientData.quantity.amount,
      unitId: ingredientData.quantity.unitId,
      threshold: ingredientData.threshold,
      storageLocationType: ingredientData.storageLocation.type,
      storageLocationDetail: ingredientData.storageLocation.detail,
      bestBeforeDate: ingredientData.expiryInfo?.bestBeforeDate
        ? new Date(ingredientData.expiryInfo.bestBeforeDate)
        : null,
      useByDate: ingredientData.expiryInfo?.useByDate
        ? new Date(ingredientData.expiryInfo.useByDate)
        : null,
    },
  })
}

/**
 * PUT /api/v1/ingredients/{id} APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('PUT /api/v1/ingredients/{id} Integration Tests', () => {
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
    it('食材名のみ更新できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 部分更新リクエスト（食材名のみ）
      const updateData = {
        name: faker.food.ingredient() + '_updated',
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 200 OKが返される
      expect(response.status).toBe(200)
      expect(data.ingredient.name).toBe(updateData.name)
      expect(data.ingredient.id).toBe(ingredient.id)

      // データベースで更新されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.name).toBe(updateData.name)
    })

    it('在庫情報を更新できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)
      const testDataIds = getTestDataIds()

      // 在庫情報更新リクエスト
      const updateData = {
        stock: {
          quantity: 99.5,
          unitId: testDataIds.units.gram,
          storageLocation: {
            type: StorageType.FROZEN,
            detail: '冷凍庫の上段',
          },
          threshold: 5.0,
        },
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 在庫情報が更新される
      expect(response.status).toBe(200)
      expect(data.ingredient.stock.quantity).toBe(99.5)
      expect(data.ingredient.stock.unit.id).toBe(testDataIds.units.gram)
      expect(data.ingredient.stock.storageLocation.type).toBe(StorageType.FROZEN)
      expect(data.ingredient.stock.storageLocation.detail).toBe('冷凍庫の上段')
      expect(data.ingredient.stock.threshold).toBe(5.0)

      // データベースで更新されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.quantity).toBe(99.5)
      expect(dbIngredient?.unitId).toBe(testDataIds.units.gram)
      expect(dbIngredient?.storageLocationType).toBe(StorageType.FROZEN)
      expect(dbIngredient?.storageLocationDetail).toBe('冷凍庫の上段')
      expect(dbIngredient?.threshold).toBe(5.0)
    })

    it('期限情報を更新できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 期限情報更新リクエスト
      const newBestBefore = testDataHelpers.dateStringFromNow(14)
      const newUseBy = testDataHelpers.dateStringFromNow(10)

      const updateData = {
        expiryInfo: {
          bestBeforeDate: newBestBefore,
          useByDate: newUseBy,
        },
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 期限情報が更新される
      expect(response.status).toBe(200)
      expect(data.ingredient.expiryInfo).toBeDefined()
      expect(data.ingredient.expiryInfo.bestBeforeDate).toBe(newBestBefore)
      expect(data.ingredient.expiryInfo.useByDate).toBe(newUseBy)

      // データベースで更新されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.bestBeforeDate?.toISOString().split('T')[0]).toBe(newBestBefore)
      expect(dbIngredient?.useByDate?.toISOString().split('T')[0]).toBe(newUseBy)
    })

    it('複数フィールドを同時に更新できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)
      const testDataIds = getTestDataIds()

      // 複数フィールドの更新リクエスト
      const updateData = {
        name: 'マルチ更新テスト食材',
        memo: '複数フィールドの更新テスト',
        price: 2500,
        purchaseDate: testDataHelpers.dateStringFromNow(-1),
        stock: {
          quantity: 3,
          unitId: testDataIds.units.piece,
          storageLocation: {
            type: StorageType.ROOM_TEMPERATURE,
            detail: 'パントリー',
          },
          threshold: 1,
        },
        expiryInfo: {
          bestBeforeDate: testDataHelpers.dateStringFromNow(30),
          useByDate: testDataHelpers.dateStringFromNow(25),
        },
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 全フィールドが更新される
      expect(response.status).toBe(200)
      expect(data.ingredient.name).toBe(updateData.name)
      expect(data.ingredient.memo).toBe(updateData.memo)
      expect(data.ingredient.price).toBe(updateData.price)
      expect(data.ingredient.purchaseDate).toBe(updateData.purchaseDate)
      expect(data.ingredient.stock.quantity).toBe(updateData.stock.quantity)
      expect(data.ingredient.stock.unit.id).toBe(updateData.stock.unitId)
      expect(data.ingredient.stock.storageLocation.type).toBe(updateData.stock.storageLocation.type)
      expect(data.ingredient.stock.storageLocation.detail).toBe(
        updateData.stock.storageLocation.detail
      )
      expect(data.ingredient.stock.threshold).toBe(updateData.stock.threshold)
      expect(data.ingredient.expiryInfo.bestBeforeDate).toBe(updateData.expiryInfo.bestBeforeDate)
      expect(data.ingredient.expiryInfo.useByDate).toBe(updateData.expiryInfo.useByDate)
    })

    it('nullで値をクリアできる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: メモと価格がある食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // nullでクリアするリクエスト
      const updateData = {
        memo: null,
        price: null,
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 値がクリアされる
      expect(response.status).toBe(200)
      expect(data.ingredient.memo).toBeNull()
      expect(data.ingredient.price).toBeNull()

      // データベースでもクリアされていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.memo).toBeNull()
      expect(dbIngredient?.price).toBeNull()
    })
  })

  describe('バリデーションエラー', () => {
    it('食材名が長すぎる場合400エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 51文字の食材名
      const longName = faker.string.alphanumeric(51)
      const updateData = { name: longName }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('50文字以内')
    })

    it('数量が0以下の場合400エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)
      const testDataIds = getTestDataIds()

      // 無効な数量
      const updateData = {
        stock: {
          quantity: 0,
          unitId: testDataIds.units.piece,
          storageLocation: {
            type: StorageType.REFRIGERATED,
          },
        },
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('数量')
    })

    it('存在しない単位IDの場合404エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 存在しない単位ID
      const nonExistentUnitId = testDataHelpers.unitId()
      const updateData = {
        stock: {
          quantity: 5,
          unitId: nonExistentUnitId,
          storageLocation: {
            type: StorageType.REFRIGERATED,
          },
        },
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('Unit not found')
    })
  })

  describe('存在しないリソース', () => {
    it('存在しない食材IDの場合404エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 存在しない食材ID
      const nonExistentId = testDataHelpers.ingredientId()
      const updateData = { name: '存在しない食材' }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${nonExistentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: nonExistentId } })
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('Ingredient not found')
    })

    it('他のユーザーの食材は更新できない', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 他のユーザーの食材を作成
      const otherUserId = testDataHelpers.userId()
      const ingredient = await createTestIngredient(otherUserId, prisma)

      const updateData = { name: '他人の食材更新試行' }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す（認証ユーザーは別ユーザー）
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 404 Not Foundが返される（セキュリティのため存在しないかのように扱う）
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('存在しないカテゴリーIDの場合404エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 存在しないカテゴリーID
      const nonExistentCategoryId = testDataHelpers.categoryId()
      const updateData = { categoryId: nonExistentCategoryId }

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('Category not found')
    })
  })

  describe('認証', () => {
    it('認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      // Given: 有効な更新データ
      const updateData = { name: '認証なし更新試行' }
      const ingredientId = testDataHelpers.ingredientId()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredientId } })
      const data = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toContain('認証が必要です')
    })

    it('domainUserIdがない場合401エラーを返す', async () => {
      // domainUserIdがないセッションのモック
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'invalid-user-id',
          email: faker.internet.email(),
          // domainUserIdがない
        },
      } as any)

      // Given: 有効な更新データ
      const updateData = { name: 'domainUserId無し更新試行' }
      const ingredientId = testDataHelpers.ingredientId()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredientId } })
      const data = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('不正なリクエスト', () => {
    it('JSONパースエラーの場合400エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 不正なJSON
      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('無効なリクエストボディです')
    })

    it('空のリクエストボディでも処理できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)
      const originalName = ingredient.name

      // 空のリクエストボディ
      const updateData = {}

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 200 OKが返される（何も変更されない）
      expect(response.status).toBe(200)
      expect(data.ingredient.name).toBe(originalName) // 変更されていない
    })
  })
})
