import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/[id]/route'
import { auth } from '@/auth'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { CreateIngredientCommandBuilder, testDataHelpers } from '@tests/__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '@tests/helpers/database.helper'

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
  prisma: ReturnType<typeof getTestPrismaClient>,
  options?: {
    name?: string
    categoryId?: string
    unitId?: string
    withExpiry?: boolean
    withMemo?: boolean
    withPrice?: boolean
    storageType?: StorageType
  }
) {
  const testDataIds = getTestDataIds()
  const ingredientData = new CreateIngredientCommandBuilder()
    .withUserId(userId)
    .withName(options?.name || faker.food.ingredient())
    .withCategoryId(options?.categoryId || testDataIds.categories.vegetable)
    .withQuantity(faker.number.int({ min: 1, max: 20 }), options?.unitId || testDataIds.units.piece)
    .withStorageLocation({
      type: options?.storageType || StorageType.REFRIGERATED,
      detail: '野菜室',
    })
    .withPurchaseDate(testDataHelpers.todayString())

  if (options?.withPrice) {
    ingredientData.withPrice(faker.number.int({ min: 100, max: 5000 }))
  }

  if (options?.withMemo) {
    ingredientData.withMemo(faker.lorem.sentence())
  }

  if (options?.withExpiry) {
    ingredientData.withBestBeforeDate(
      testDataHelpers.dateStringFromNow(faker.number.int({ min: 7, max: 30 }))
    )
    ingredientData.withUseByDate(
      testDataHelpers.dateStringFromNow(faker.number.int({ min: 3, max: 6 }))
    )
  }

  const built = ingredientData.build()

  return await prisma.ingredient.create({
    data: {
      id: testDataHelpers.ingredientId(),
      userId: userId,
      name: built.name,
      categoryId: built.categoryId,
      memo: built.memo,
      price: built.price?.toString(),
      purchaseDate: new Date(built.purchaseDate),
      quantity: built.quantity.amount,
      unitId: built.quantity.unitId,
      threshold: built.threshold,
      storageLocationType: built.storageLocation.type,
      storageLocationDetail: built.storageLocation.detail,
      bestBeforeDate: built.expiryInfo?.bestBeforeDate
        ? new Date(built.expiryInfo.bestBeforeDate)
        : null,
      useByDate: built.expiryInfo?.useByDate ? new Date(built.expiryInfo.useByDate) : null,
    },
  })
}

/**
 * GET /api/v1/ingredients/{id} APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証（CQRSパターンでの最適化含む）
 */
describe('GET /api/v1/ingredients/{id} Integration Tests', () => {
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
    it('最小限の食材情報を取得できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 最小限の情報を持つ食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: 200 OKが返される
      expect(response.status).toBe(200)
      expect(data.ingredient).toBeDefined()
      expect(data.ingredient.id).toBe(ingredient.id)
      expect(data.ingredient.name).toBe(ingredient.name)
      expect(data.ingredient.userId).toBe(testUserId)

      // カテゴリー情報が含まれることを確認（JOINによる取得）
      expect(data.ingredient.category).toBeDefined()
      expect(data.ingredient.category.id).toBe(ingredient.categoryId)
      expect(data.ingredient.category.name).toBeDefined()

      // 在庫情報が含まれることを確認
      expect(data.ingredient.stock).toBeDefined()
      expect(data.ingredient.stock.quantity).toBe(ingredient.quantity)
      expect(data.ingredient.stock.unit).toBeDefined()
      expect(data.ingredient.stock.unit.id).toBe(ingredient.unitId)
      expect(data.ingredient.stock.unit.name).toBeDefined()
      expect(data.ingredient.stock.unit.symbol).toBeDefined()

      // 保存場所情報が含まれることを確認
      expect(data.ingredient.stock.storageLocation).toBeDefined()
      expect(data.ingredient.stock.storageLocation.type).toBe(ingredient.storageLocationType)
      expect(data.ingredient.stock.storageLocation.detail).toBe(ingredient.storageLocationDetail)

      // 購入日が含まれることを確認
      expect(data.ingredient.purchaseDate).toBeDefined()

      // オプショナルフィールドがnullまたは未定義であることを確認
      expect(data.ingredient.memo).toBeNull()
      expect(data.ingredient.price).toBeNull()
      expect(data.ingredient.expiryInfo).toBeNull()
      expect(data.ingredient.stock.threshold).toBeNull()
    })

    it('すべての情報を含む食材を取得できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: すべての情報を持つ食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma, {
        withExpiry: true,
        withMemo: true,
        withPrice: true,
      })

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: すべての情報が含まれる
      expect(response.status).toBe(200)
      expect(data.ingredient.memo).toBe(ingredient.memo)
      expect(data.ingredient.price).toBe(parseFloat(ingredient.price!.toString()))

      // 期限情報が含まれることを確認
      expect(data.ingredient.expiryInfo).toBeDefined()
      expect(data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
      expect(data.ingredient.expiryInfo.useByDate).toBeDefined()

      // 日付形式が正しいことを確認（YYYY-MM-DD）
      expect(data.ingredient.expiryInfo.bestBeforeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(data.ingredient.expiryInfo.useByDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(data.ingredient.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('異なるカテゴリーの食材を取得できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なるカテゴリーの食材を作成
      const testDataIds = getTestDataIds()
      const meatIngredient = await createTestIngredient(testUserId, prisma, {
        name: '鶏肉',
        categoryId: testDataIds.categories.meatFish,
        unitId: testDataIds.units.gram,
        storageType: StorageType.FROZEN,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/v1/ingredients/${meatIngredient.id}`,
        {
          method: 'GET',
        }
      )

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: meatIngredient.id }) })
      const data = await response.json()

      // Then: 正しいカテゴリー情報が返される
      expect(response.status).toBe(200)
      expect(data.ingredient.category.id).toBe(testDataIds.categories.meatFish)
      expect(data.ingredient.stock.unit.id).toBe(testDataIds.units.gram)
      expect(data.ingredient.stock.storageLocation.type).toBe(StorageType.FROZEN)
    })

    it('単一クエリでの最適化（N+1問題回避）を確認', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // Prismaクエリ実行回数をカウント
      const originalFindFirst = prisma.ingredient.findFirst
      let queryCount = 0
      prisma.ingredient.findFirst = vi.fn().mockImplementation(async (args: any) => {
        queryCount++
        return originalFindFirst.call(prisma.ingredient, args)
      })

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: 単一クエリで全ての情報が取得される
      expect(response.status).toBe(200)
      expect(queryCount).toBe(1) // 1回のクエリのみ実行される
      expect(data.ingredient.category).toBeDefined() // JOINで取得
      expect(data.ingredient.stock.unit).toBeDefined() // JOINで取得

      // Prismaクライアントを復元
      prisma.ingredient.findFirst = originalFindFirst
    })
  })

  describe('存在しないリソース', () => {
    it('存在しない食材IDの場合404エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 存在しない食材ID
      const nonExistentId = testDataHelpers.ingredientId()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${nonExistentId}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: nonExistentId }) })
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('食材が見つかりません')
    })

    it('他のユーザーの食材は取得できない', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 他のユーザーを作成し、そのユーザーの食材を作成
      const { createTestUser } = await import('../../../../../helpers/database.helper')
      const otherUser = await createTestUser()
      const ingredient = await createTestIngredient(otherUser.domainUserId, prisma)

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す（認証ユーザーは別ユーザー）
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: 404 Not Foundが返される（セキュリティのため存在しないかのように扱う）
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('削除済み食材は取得できない', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 削除済みの食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 論理削除
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { deletedAt: new Date() },
      })

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: 削除済み食材の取得を試行
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('無効なID形式の場合400エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 無効なID形式
      const invalidId = 'invalid-id'

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${invalidId}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: invalidId }) })
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('無効なIDフォーマット')
    })
  })

  describe('認証', () => {
    it('認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      // Given: 有効な食材ID
      const ingredientId = testDataHelpers.ingredientId()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredientId }) })
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

      // Given: 有効な食材ID
      const ingredientId = testDataHelpers.ingredientId()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredientId }) })
      const data = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('データ整合性', () => {
    it('カテゴリーマスタとの整合性を確認', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 特定カテゴリーの食材を作成
      const testDataIds = getTestDataIds()
      const ingredient = await createTestIngredient(testUserId, prisma, {
        categoryId: testDataIds.categories.vegetable,
      })

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: カテゴリー情報が正しく取得される
      expect(response.status).toBe(200)
      expect(data.ingredient.category.id).toBe(testDataIds.categories.vegetable)

      // カテゴリーマスタから正しい情報が取得されていることを確認
      const categoryFromMaster = await prisma.category.findUnique({
        where: { id: testDataIds.categories.vegetable },
      })
      expect(data.ingredient.category.name).toBe(categoryFromMaster?.name)
    })

    it('単位マスタとの整合性を確認', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 特定単位の食材を作成
      const testDataIds = getTestDataIds()
      const ingredient = await createTestIngredient(testUserId, prisma, {
        unitId: testDataIds.units.gram,
      })

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: 単位情報が正しく取得される
      expect(response.status).toBe(200)
      expect(data.ingredient.stock.unit.id).toBe(testDataIds.units.gram)

      // 単位マスタから正しい情報が取得されていることを確認
      const unitFromMaster = await prisma.unit.findUnique({
        where: { id: testDataIds.units.gram },
      })
      expect(data.ingredient.stock.unit.name).toBe(unitFromMaster?.name)
      expect(data.ingredient.stock.unit.symbol).toBe(unitFromMaster?.symbol)
    })

    it('期限情報のタイムゾーン処理を確認', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 期限情報付きの食材を作成
      const specificDate = '2024-12-25'
      const ingredient = await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId: testUserId,
          name: '期限テスト食材',
          categoryId: getTestDataIds().categories.vegetable,
          quantity: 1,
          unitId: getTestDataIds().units.piece,
          storageLocationType: StorageType.REFRIGERATED,
          purchaseDate: new Date('2024-12-20'),
          bestBeforeDate: new Date(specificDate + 'T00:00:00.000Z'),
          useByDate: new Date('2024-12-23T00:00:00.000Z'),
        },
      })

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: 期限情報が正しい日付形式で返される
      expect(response.status).toBe(200)
      expect(data.ingredient.expiryInfo.bestBeforeDate).toBe(specificDate)
      expect(data.ingredient.expiryInfo.useByDate).toBe('2024-12-23')
      expect(data.ingredient.purchaseDate).toBe('2024-12-20')
    })
  })

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合500エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // Prismaクライアントを故意に破壊してエラーを発生させる
      const originalFindFirst = prisma.ingredient.findFirst
      prisma.ingredient.findFirst = vi
        .fn()
        .mockRejectedValue(new Error('Database connection error'))

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: ingredient.id }) })
      const data = await response.json()

      // Then: 500 Internal Server Errorが返される
      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toContain('サーバーエラー')

      // Prismaクライアントを復元
      prisma.ingredient.findFirst = originalFindFirst
    })
  })
})
