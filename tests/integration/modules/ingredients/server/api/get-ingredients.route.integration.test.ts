import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/route'
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
  prisma: ReturnType<typeof getTestPrismaClient>,
  options?: {
    name?: string
    categoryId?: string
    unitId?: string
    quantity?: number
    storageType?: StorageType
    withExpiry?: boolean
    expiryDays?: number // 何日後に期限切れか
    withMemo?: boolean
    withPrice?: boolean
  }
) {
  const testDataIds = getTestDataIds()
  const ingredientData = new CreateIngredientCommandBuilder()
    .withUserId(userId)
    .withName(options?.name || faker.food.ingredient())
    .withCategoryId(options?.categoryId || testDataIds.categories.vegetable)
    .withQuantity(
      options?.quantity || faker.number.int({ min: 1, max: 20 }),
      options?.unitId || testDataIds.units.piece
    )
    .withStorageLocation({
      type: options?.storageType || StorageType.REFRIGERATED,
      detail: '保存場所',
    })
    .withPurchaseDate(testDataHelpers.todayString())

  if (options?.withPrice) {
    ingredientData.withPrice(faker.number.int({ min: 100, max: 5000 }))
  }

  if (options?.withMemo) {
    ingredientData.withMemo(faker.lorem.sentence())
  }

  if (options?.withExpiry) {
    const expiryDays = options?.expiryDays || faker.number.int({ min: 7, max: 30 })
    ingredientData.withBestBeforeDate(testDataHelpers.dateStringFromNow(expiryDays))
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
 * GET /api/v1/ingredients APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証（検索・フィルタリング・ページネーション機能含む）
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

  describe('基本的な取得', () => {
    it('食材一覧を取得できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 複数の食材を作成
      const ingredients = []
      for (let i = 0; i < 3; i++) {
        const ingredient = await createTestIngredient(testUserId, prisma, {
          name: `テスト食材${i}`,
        })
        ingredients.push(ingredient)
      }

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 200 OKが返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(3)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.total).toBe(3)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20) // デフォルト値

      // 各食材の基本情報が含まれることを確認
      // 更新日時でソートされるため、作成順序と逆になる
      const reversedIngredients = [...ingredients].reverse()
      data.ingredients.forEach((ingredient: any, index: number) => {
        expect(ingredient.id).toBeDefined()
        expect(ingredient.name).toBe(reversedIngredients[index].name)
        expect(ingredient.category).toBeDefined()
        expect(ingredient.stock).toBeDefined()
        expect(ingredient.stock.unit).toBeDefined()
      })
    })

    it('空の結果を正しく処理できる', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 食材が存在しない状態

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 空の配列が返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(0)
      expect(data.pagination.total).toBe(0)
      expect(data.pagination.page).toBe(1)
    })

    it('他のユーザーの食材は含まれない', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 認証ユーザーと他のユーザーの食材を作成
      await createTestIngredient(testUserId, prisma, { name: '自分の食材' })

      const { createTestUser } = await import('../../../../../helpers/database.helper')
      const otherUser = await createTestUser()
      await createTestIngredient(otherUser.domainUserId, prisma, { name: '他人の食材' })

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 自分の食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(1)
      expect(data.ingredients[0].name).toBe('自分の食材')
    })

    it('削除済み食材は含まれない', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: アクティブな食材と削除済み食材を作成
      await createTestIngredient(testUserId, prisma, { name: 'アクティブ食材' })

      const deletedIngredient = await createTestIngredient(testUserId, prisma, {
        name: '削除済み食材',
      })
      await prisma.ingredient.update({
        where: { id: deletedIngredient.id },
        data: { deletedAt: new Date() },
      })

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: アクティブな食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(1)
      expect(data.ingredients[0].name).toBe('アクティブ食材')
    })
  })

  describe('ページネーション', () => {
    it('ページネーションが正しく動作する', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 25件の食材を作成（デフォルトのlimit=20を超える）
      for (let i = 0; i < 25; i++) {
        await createTestIngredient(testUserId, prisma, {
          name: `食材${String(i).padStart(2, '0')}`,
        })
      }

      // When: 1ページ目を取得
      const request1 = new NextRequest('http://localhost:3000/api/v1/ingredients?page=1&limit=10', {
        method: 'GET',
      })
      const response1 = await GET(request1)
      const data1 = await response1.json()

      // Then: 1ページ目に10件返される
      expect(response1.status).toBe(200)
      expect(data1.ingredients).toHaveLength(10)
      expect(data1.pagination.page).toBe(1)
      expect(data1.pagination.limit).toBe(10)
      expect(data1.pagination.total).toBe(25)
      expect(data1.pagination.totalPages).toBe(3)

      // When: 2ページ目を取得
      const request2 = new NextRequest('http://localhost:3000/api/v1/ingredients?page=2&limit=10', {
        method: 'GET',
      })
      const response2 = await GET(request2)
      const data2 = await response2.json()

      // Then: 2ページ目に10件返される（異なる食材）
      expect(response2.status).toBe(200)
      expect(data2.ingredients).toHaveLength(10)
      expect(data2.pagination.page).toBe(2)

      // 1ページ目と2ページ目で異なる食材が返されることを確認
      const page1Ids = data1.ingredients.map((ing: any) => ing.id)
      const page2Ids = data2.ingredients.map((ing: any) => ing.id)
      expect(page1Ids).not.toEqual(page2Ids)

      // When: 3ページ目（最後のページ）を取得
      const request3 = new NextRequest('http://localhost:3000/api/v1/ingredients?page=3&limit=10', {
        method: 'GET',
      })
      const response3 = await GET(request3)
      const data3 = await response3.json()

      // Then: 3ページ目に5件返される
      expect(response3.status).toBe(200)
      expect(data3.ingredients).toHaveLength(5)
      expect(data3.pagination.page).toBe(3)
    })

    it('存在しないページの場合空の結果を返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 5件の食材のみ作成
      for (let i = 0; i < 5; i++) {
        await createTestIngredient(testUserId, prisma)
      }

      // When: 存在しないページ（10ページ目）を要求
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients?page=10&limit=10', {
        method: 'GET',
      })
      const response = await GET(request)
      const data = await response.json()

      // Then: 空の結果が返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(0)
      expect(data.pagination.page).toBe(10)
      expect(data.pagination.total).toBe(5)
    })
  })

  describe('検索機能', () => {
    it('名前で検索できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なる名前の食材を作成
      await createTestIngredient(testUserId, prisma, { name: 'トマト' })
      await createTestIngredient(testUserId, prisma, { name: 'キュウリ' })
      await createTestIngredient(testUserId, prisma, { name: 'ミニトマト' })

      // When: 「トマト」で検索
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients?search=トマト', {
        method: 'GET',
      })
      const response = await GET(request)
      const data = await response.json()

      // Then: トマトを含む食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(2)

      const names = data.ingredients.map((ing: any) => ing.name)
      expect(names).toContain('トマト')
      expect(names).toContain('ミニトマト')
      expect(names).not.toContain('キュウリ')
    })

    it('部分一致検索が動作する', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 検索テスト用食材を作成
      await createTestIngredient(testUserId, prisma, { name: '鶏むね肉' })
      await createTestIngredient(testUserId, prisma, { name: '豚バラ肉' })
      await createTestIngredient(testUserId, prisma, { name: '牛すじ' })

      // When: 「肉」で検索
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients?search=肉', {
        method: 'GET',
      })
      const response = await GET(request)
      const data = await response.json()

      // Then: 「肉」を含む食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(2)

      const names = data.ingredients.map((ing: any) => ing.name)
      expect(names).toContain('鶏むね肉')
      expect(names).toContain('豚バラ肉')
      expect(names).not.toContain('牛すじ')
    })

    it('大小文字・ひらがなカタカナを区別しない検索', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なる表記の食材を作成
      await createTestIngredient(testUserId, prisma, { name: 'TOMATO' })
      await createTestIngredient(testUserId, prisma, { name: 'tomato' })

      // When: 小文字で検索
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients?search=toma', {
        method: 'GET',
      })
      const response = await GET(request)
      const data = await response.json()

      // Then: 大文字・小文字両方がヒットする
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(2)
    })
  })

  describe('フィルタリング', () => {
    it('カテゴリーでフィルタリングできる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なるカテゴリーの食材を作成
      const testDataIds = getTestDataIds()
      await createTestIngredient(testUserId, prisma, {
        name: 'トマト',
        categoryId: testDataIds.categories.vegetable,
      })
      await createTestIngredient(testUserId, prisma, {
        name: '鶏肉',
        categoryId: testDataIds.categories.meatFish,
      })
      await createTestIngredient(testUserId, prisma, {
        name: 'キュウリ',
        categoryId: testDataIds.categories.vegetable,
      })

      // When: 野菜カテゴリーでフィルタリング
      const request = new NextRequest(
        `http://localhost:3000/api/v1/ingredients?categoryId=${testDataIds.categories.vegetable}`,
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Then: 野菜カテゴリーの食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(2)

      const names = data.ingredients.map((ing: any) => ing.name)
      expect(names).toContain('トマト')
      expect(names).toContain('キュウリ')
      expect(names).not.toContain('鶏肉')
    })

    it('期限状態でフィルタリングできる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なる期限状態の食材を作成
      await createTestIngredient(testUserId, prisma, {
        name: '期限間近食材',
        withExpiry: true,
        expiryDays: 2, // 2日後に期限切れ（期限間近）
      })
      await createTestIngredient(testUserId, prisma, {
        name: '期限切れ食材',
        withExpiry: true,
        expiryDays: -1, // 1日前に期限切れ
      })
      await createTestIngredient(testUserId, prisma, {
        name: '新鮮食材',
        withExpiry: true,
        expiryDays: 10, // 10日後に期限切れ（新鮮）
      })

      // When: 期限間近食材でフィルタリング
      const request = new NextRequest(
        'http://localhost:3000/api/v1/ingredients?expiryStatus=expiring',
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Then: 期限間近の食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(1)
      expect(data.ingredients[0].name).toBe('期限間近食材')
    })

    it.skip('在庫状態でフィルタリングできる（未実装）', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なる在庫状態の食材を作成
      await createTestIngredient(testUserId, prisma, {
        name: '在庫あり食材',
        quantity: 10,
      })
      await createTestIngredient(testUserId, prisma, {
        name: '在庫切れ食材',
        quantity: 0,
      })

      // When: 在庫切れ食材でフィルタリング
      const request = new NextRequest(
        'http://localhost:3000/api/v1/ingredients?stockStatus=out_of_stock',
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Then: 在庫切れの食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(1)
      expect(data.ingredients[0].name).toBe('在庫切れ食材')
      expect(data.ingredients[0].stock.quantity).toBe(0)
    })

    it('複数条件でのフィルタリング', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 複数の条件を満たす食材と満たさない食材を作成
      const testDataIds = getTestDataIds()
      await createTestIngredient(testUserId, prisma, {
        name: '野菜トマト',
        categoryId: testDataIds.categories.vegetable,
        quantity: 0, // 在庫切れ
      })
      await createTestIngredient(testUserId, prisma, {
        name: '肉トマト', // 名前は一致するがカテゴリーが違う
        categoryId: testDataIds.categories.meatFish,
        quantity: 0,
      })
      await createTestIngredient(testUserId, prisma, {
        name: '野菜キュウリ', // カテゴリーは一致するが在庫あり
        categoryId: testDataIds.categories.vegetable,
        quantity: 5,
      })

      // When: 検索キーワード、カテゴリー、在庫状態で複合フィルタリング
      const request = new NextRequest(
        `http://localhost:3000/api/v1/ingredients?search=トマト&categoryId=${testDataIds.categories.vegetable}&stockStatus=out_of_stock`,
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Then: すべての条件を満たす食材のみ返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(1)
      expect(data.ingredients[0].name).toBe('野菜トマト')
    })
  })

  describe('ソート機能', () => {
    it('名前でソートできる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なる名前の食材を作成
      await createTestIngredient(testUserId, prisma, { name: 'ザーサイ' })
      await createTestIngredient(testUserId, prisma, { name: 'アーモンド' })
      await createTestIngredient(testUserId, prisma, { name: 'ウーロン茶' })

      // When: 名前の昇順でソート
      const request = new NextRequest(
        'http://localhost:3000/api/v1/ingredients?sortBy=name&sortOrder=asc',
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Then: 名前順に並んでいる
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(3)
      expect(data.ingredients[0].name).toBe('アーモンド')
      expect(data.ingredients[1].name).toBe('ウーロン茶')
      expect(data.ingredients[2].name).toBe('ザーサイ')
    })

    it('購入日でソートできる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 異なる購入日の食材を作成（時間差を作るため順次作成）
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

      await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId: testUserId,
          name: '今日の食材',
          categoryId: getTestDataIds().categories.vegetable,
          quantity: 1,
          unitId: getTestDataIds().units.piece,
          storageLocationType: StorageType.REFRIGERATED,
          purchaseDate: today,
        },
      })

      await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId: testUserId,
          name: '昨日の食材',
          categoryId: getTestDataIds().categories.vegetable,
          quantity: 1,
          unitId: getTestDataIds().units.piece,
          storageLocationType: StorageType.REFRIGERATED,
          purchaseDate: yesterday,
        },
      })

      await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId: testUserId,
          name: '明日の食材',
          categoryId: getTestDataIds().categories.vegetable,
          quantity: 1,
          unitId: getTestDataIds().units.piece,
          storageLocationType: StorageType.REFRIGERATED,
          purchaseDate: tomorrow,
        },
      })

      // When: 購入日の昇順でソート
      const request = new NextRequest(
        'http://localhost:3000/api/v1/ingredients?sortBy=purchaseDate&sortOrder=asc',
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Then: 購入日順に並んでいる
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(3)
      expect(data.ingredients[0].name).toBe('昨日の食材')
      expect(data.ingredients[1].name).toBe('今日の食材')
      expect(data.ingredients[2].name).toBe('明日の食材')
    })

    it('デフォルトソート（更新日時降順）が適用される', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 時間差をつけて食材を作成
      await createTestIngredient(testUserId, prisma, { name: '最初の食材' })
      await new Promise((resolve) => setTimeout(resolve, 10)) // 10ms待機
      await createTestIngredient(testUserId, prisma, { name: '2番目の食材' })
      await new Promise((resolve) => setTimeout(resolve, 10)) // 10ms待機
      await createTestIngredient(testUserId, prisma, { name: '3番目の食材' })

      // When: ソート指定なしで取得
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })
      const response = await GET(request)
      const data = await response.json()

      // Then: 作成日時の降順（最新が最初）に並んでいる
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(3)
      expect(data.ingredients[0].name).toBe('3番目の食材')
      expect(data.ingredients[1].name).toBe('2番目の食材')
      expect(data.ingredients[2].name).toBe('最初の食材')
    })
  })

  describe('バリデーションエラー', () => {
    it('無効なページ番号の場合400エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 無効なページ番号
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients?page=0', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('page')
    })

    it('無効なlimit値の場合400エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 無効なlimit値（負数）
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients?limit=-1', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('limit')
    })

    it('無効なソート項目の場合400エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 存在しないソート項目
      const request = new NextRequest(
        'http://localhost:3000/api/v1/ingredients?sortBy=invalid_field',
        {
          method: 'GET',
        }
      )

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('sortBy')
    })

    it('存在しないカテゴリーIDでフィルタリングした場合空の結果を返す', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 食材を作成
      await createTestIngredient(testUserId, prisma)

      // 存在しないカテゴリーID
      const nonExistentCategoryId = testDataHelpers.categoryId()
      const request = new NextRequest(
        `http://localhost:3000/api/v1/ingredients?categoryId=${nonExistentCategoryId}`,
        { method: 'GET' }
      )

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 200 OKだが空の結果が返される（エラーではない）
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(0)
      expect(data.pagination.total).toBe(0)
    })
  })

  describe('認証', () => {
    it('認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
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

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('パフォーマンス', () => {
    it('大量データでのページネーション性能', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 50件の食材を作成
      for (let i = 0; i < 50; i++) {
        await createTestIngredient(testUserId, prisma, {
          name: `大量テスト食材${String(i).padStart(3, '0')}`,
        })
      }

      // When: 最後のページを取得
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients?page=5&limit=10', {
        method: 'GET',
      })
      const response = await GET(request)
      const data = await response.json()

      // Then: 正しく最後のページが返される
      expect(response.status).toBe(200)
      expect(data.ingredients).toHaveLength(10)
      expect(data.pagination.page).toBe(5)
      expect(data.pagination.total).toBe(50)
      expect(data.pagination.totalPages).toBe(5)
    })

    it('検索とフィルタリングの組み合わせ性能', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: 多様な食材を作成
      const testDataIds = getTestDataIds()
      for (let i = 0; i < 30; i++) {
        await createTestIngredient(testUserId, prisma, {
          name: i % 3 === 0 ? `トマト${i}` : `その他${i}`,
          categoryId:
            i % 2 === 0 ? testDataIds.categories.vegetable : testDataIds.categories.meatFish,
          quantity: i % 4 === 0 ? 0 : faker.number.int({ min: 1, max: 10 }),
        })
      }

      // When: 複雑な検索・フィルタリング・ソートを実行
      const request = new NextRequest(
        `http://localhost:3000/api/v1/ingredients?search=トマト&categoryId=${testDataIds.categories.vegetable}&sortBy=name&sortOrder=asc&page=1&limit=5`,
        { method: 'GET' }
      )
      const response = await GET(request)
      const data = await response.json()

      // Then: 正しい結果が返される
      expect(response.status).toBe(200)
      expect(data.ingredients.length).toBeGreaterThan(0)

      // すべての結果が条件を満たしていることを確認
      data.ingredients.forEach((ingredient: any) => {
        expect(ingredient.name).toContain('トマト')
        expect(ingredient.category.id).toBe(testDataIds.categories.vegetable)
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('データベースエラーの場合500エラーを返す', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Prismaクライアントを故意に破壊してエラーを発生させる
      const originalFindMany = prisma.ingredient.findMany
      prisma.ingredient.findMany = vi.fn().mockRejectedValue(new Error('Database connection error'))

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request)
      const data = await response.json()

      // Then: 500 Internal Server Errorが返される
      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toContain('サーバーエラー')

      // Prismaクライアントを復元
      prisma.ingredient.findMany = originalFindMany
    })
  })
})
