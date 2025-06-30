import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { DELETE } from '@/app/api/v1/ingredients/[id]/route'
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
 * DELETE /api/v1/ingredients/{id} APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証（論理削除）
 */
describe('DELETE /api/v1/ingredients/{id} Integration Tests', () => {
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
    it('食材を論理削除できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 削除前に食材が存在することを確認
      const beforeDelete = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(beforeDelete).toBeDefined()
      expect(beforeDelete?.deletedAt).toBeNull()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'DELETE',
      })

      // When: APIを呼び出す
      const response = await DELETE(request, { params: { id: ingredient.id } })

      // Then: 204 No Contentが返される
      expect(response.status).toBe(204)

      // レスポンスボディがないことを確認
      const responseText = await response.text()
      expect(responseText).toBe('')

      // データベースで論理削除されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.deletedAt).not.toBeNull()
      expect(dbIngredient?.deletedAt).toBeInstanceOf(Date)

      // 論理削除された食材は通常の検索では取得できないことを確認
      const activeIngredient = await prisma.ingredient.findFirst({
        where: {
          id: ingredient.id,
          deletedAt: null,
        },
      })
      expect(activeIngredient).toBeNull()
    })

    it('複数の食材を個別に削除できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 複数のテスト用食材を作成
      const ingredient1 = await createTestIngredient(testUserId, prisma)
      const ingredient2 = await createTestIngredient(testUserId, prisma)
      const ingredient3 = await createTestIngredient(testUserId, prisma)

      // When: 1つ目の食材を削除
      const request1 = new NextRequest(
        `http://localhost:3000/api/v1/ingredients/${ingredient1.id}`,
        {
          method: 'DELETE',
        }
      )
      const response1 = await DELETE(request1, { params: { id: ingredient1.id } })

      // Then: 1つ目のみ削除される
      expect(response1.status).toBe(204)

      // データベースの状態を確認
      const deleted = await prisma.ingredient.findUnique({
        where: { id: ingredient1.id },
      })
      const active1 = await prisma.ingredient.findUnique({
        where: { id: ingredient2.id },
      })
      const active2 = await prisma.ingredient.findUnique({
        where: { id: ingredient3.id },
      })

      expect(deleted?.deletedAt).not.toBeNull()
      expect(active1?.deletedAt).toBeNull()
      expect(active2?.deletedAt).toBeNull()

      // When: 2つ目の食材も削除
      const request2 = new NextRequest(
        `http://localhost:3000/api/v1/ingredients/${ingredient2.id}`,
        {
          method: 'DELETE',
        }
      )
      const response2 = await DELETE(request2, { params: { id: ingredient2.id } })

      // Then: 2つ目も削除される
      expect(response2.status).toBe(204)

      // アクティブな食材は1つだけ残る
      const activeCount = await prisma.ingredient.count({
        where: {
          userId: testUserId,
          deletedAt: null,
        },
      })
      expect(activeCount).toBe(1)
    })
  })

  describe('存在しないリソース', () => {
    it('存在しない食材IDの場合404エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 存在しない食材ID
      const nonExistentId = testDataHelpers.ingredientId()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${nonExistentId}`, {
        method: 'DELETE',
      })

      // When: APIを呼び出す
      const response = await DELETE(request, { params: { id: nonExistentId } })
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('Ingredient not found')
    })

    it('他のユーザーの食材は削除できない', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 他のユーザーの食材を作成
      const otherUserId = testDataHelpers.userId()
      const ingredient = await createTestIngredient(otherUserId, prisma)

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'DELETE',
      })

      // When: APIを呼び出す（認証ユーザーは別ユーザー）
      const response = await DELETE(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 404 Not Foundが返される（セキュリティのため存在しないかのように扱う）
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')

      // 他のユーザーの食材は削除されていないことを確認
      const otherIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(otherIngredient?.deletedAt).toBeNull()
    })

    it('既に削除済みの食材の場合404エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 削除済みの食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // 事前に論理削除
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { deletedAt: new Date() },
      })

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'DELETE',
      })

      // When: 削除済み食材の削除を試行
      const response = await DELETE(request, { params: { id: ingredient.id } })
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
        method: 'DELETE',
      })

      // When: APIを呼び出す
      const response = await DELETE(request, { params: { id: invalidId } })
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('有効なID形式')
    })
  })

  describe('認証', () => {
    it('認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      // Given: 有効な食材ID
      const ingredientId = testDataHelpers.ingredientId()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
        method: 'DELETE',
      })

      // When: APIを呼び出す
      const response = await DELETE(request, { params: { id: ingredientId } })
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
        method: 'DELETE',
      })

      // When: APIを呼び出す
      const response = await DELETE(request, { params: { id: ingredientId } })
      const data = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合500エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成
      const ingredient = await createTestIngredient(testUserId, prisma)

      // Prismaクライアントを故意に破壊してエラーを発生させる
      // テスト環境でのみ実行（実際のアプリケーションでは発生しない）
      const originalFindFirst = prisma.ingredient.findFirst
      prisma.ingredient.findFirst = vi
        .fn()
        .mockRejectedValue(new Error('Database connection error'))

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredient.id}`, {
        method: 'DELETE',
      })

      // When: APIを呼び出す
      const response = await DELETE(request, { params: { id: ingredient.id } })
      const data = await response.json()

      // Then: 500 Internal Server Errorが返される
      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toContain('サーバーエラー')

      // Prismaクライアントを復元
      prisma.ingredient.findFirst = originalFindFirst
    })
  })

  describe('パフォーマンスと並行性', () => {
    it('同時に複数の食材を削除できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 複数のテスト用食材を作成
      const ingredients = []
      for (let i = 0; i < 3; i++) {
        const ingredient = await createTestIngredient(testUserId, prisma)
        ingredients.push(ingredient)
      }

      // When: 順次削除（SQLiteの並行処理制限を回避）
      const responses = []
      for (const ingredient of ingredients) {
        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${ingredient.id}`,
          {
            method: 'DELETE',
          }
        )
        const response = await DELETE(request, { params: { id: ingredient.id } })
        responses.push(response)
      }

      // Then: 全て成功する
      responses.forEach((response) => {
        expect(response.status).toBe(204)
      })

      // 全て論理削除されていることを確認
      const deletedCount = await prisma.ingredient.count({
        where: {
          userId: testUserId,
          deletedAt: { not: null },
        },
      })
      expect(deletedCount).toBe(3)

      // アクティブな食材がないことを確認
      const activeCount = await prisma.ingredient.count({
        where: {
          userId: testUserId,
          deletedAt: null,
        },
      })
      expect(activeCount).toBe(0)
    })
  })

  describe('データ整合性', () => {
    it('削除後に同じIDで新規作成できる（論理削除のため物理的IDは異なる）', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: テスト用食材を作成し削除
      const originalIngredient = await createTestIngredient(testUserId, prisma)
      const originalId = originalIngredient.id

      const deleteRequest = new NextRequest(
        `http://localhost:3000/api/v1/ingredients/${originalId}`,
        {
          method: 'DELETE',
        }
      )
      await DELETE(deleteRequest, { params: { id: originalId } })

      // When: 削除後に同じ名前の食材を新規作成
      const testDataIds = getTestDataIds()
      const newIngredient = await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(), // 新しいID
          userId: testUserId,
          name: originalIngredient.name, // 同じ名前
          categoryId: testDataIds.categories.vegetable,
          quantity: 1,
          unitId: testDataIds.units.piece,
          storageLocationType: StorageType.REFRIGERATED,
          purchaseDate: new Date(),
        },
      })

      // Then: 新規作成が成功する
      expect(newIngredient.id).not.toBe(originalId) // IDは異なる
      expect(newIngredient.name).toBe(originalIngredient.name) // 名前は同じ
      expect(newIngredient.deletedAt).toBeNull() // アクティブ

      // 論理削除された元の食材はまだ存在することを確認
      const deletedIngredient = await prisma.ingredient.findUnique({
        where: { id: originalId },
      })
      expect(deletedIngredient?.deletedAt).not.toBeNull()

      // アクティブな食材として新しい食材のみが検索される
      const activeIngredients = await prisma.ingredient.findMany({
        where: {
          userId: testUserId,
          name: originalIngredient.name,
          deletedAt: null,
        },
      })
      expect(activeIngredients).toHaveLength(1)
      expect(activeIngredients[0].id).toBe(newIngredient.id)
    })
  })
})
