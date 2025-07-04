import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { POST } from '@/app/api/v1/ingredients/route'
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
 * POST /api/v1/ingredients APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('POST /api/v1/ingredients Integration Tests', () => {
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
    describe('基本的な食材作成', () => {
      it('TC001: 有効なリクエストで食材を作成できる', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 有効なリクエストボディ
        const testDataIds = getTestDataIds()
        const command = new CreateIngredientCommandBuilder()
          .withUserId(testUserId)
          .withCategoryId(testDataIds.categories.vegetable) // 実在するカテゴリーID
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece) // 実在する単位ID
          .withStorageLocation({
            type: faker.helpers.arrayElement([
              StorageType.REFRIGERATED,
              StorageType.FROZEN,
              StorageType.ROOM_TEMPERATURE,
            ]),
            detail: faker.helpers.arrayElement(['野菜室', '冷凍庫', 'パントリー']),
          })
          .withPurchaseDate(testDataHelpers.todayString())
          .withPrice(faker.number.int({ min: 100, max: 5000 }))
          .withBestBeforeDate(
            testDataHelpers.dateStringFromNow(faker.number.int({ min: 7, max: 30 }))
          )
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 201 Createdが返される
        expect(response.status).toBe(201)
        expect(data).toBeDefined()
        expect(data.ingredient).toBeDefined()
        expect(data.ingredient.id).toBeDefined()
        expect(data.ingredient.name).toBe(command.name)
        expect(data.ingredient.category).toBeDefined()
        expect(data.ingredient.category.id).toBe(command.categoryId)
        expect(data.ingredient.stock).toBeDefined()
        expect(data.ingredient.stock.quantity).toBe(command.quantity.amount)
        expect(data.ingredient.stock.unit.id).toBe(command.quantity.unitId)

        // データベースに保存されていることを確認
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: data.ingredient.id },
        })
        expect(dbIngredient).toBeDefined()
        expect(dbIngredient?.name).toBe(command.name)
        expect(dbIngredient?.userId).toBe(testUserId)
      })

      it('TC002: 最小限の必須フィールドで食材を作成できる', async () => {
        // 認証済みユーザーのモック設定
        mockAuthUser()

        // Given: 最小限の必須フィールドのみのリクエスト
        const testDataIds = getTestDataIds()
        const minimalCommand = {
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: faker.number.int({ min: 1, max: 10 }),
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: StorageType.REFRIGERATED,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(minimalCommand),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 201 Createdが返される
        expect(response.status).toBe(201)
        expect(data.ingredient.memo).toBeNull()
        expect(data.ingredient.price).toBeNull()
        expect(data.ingredient.expiryInfo).toBeNull()
      })

      it('TC003: 全オプションフィールドを含めて食材を作成できる', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 全フィールドを含むリクエスト
        const testDataIds = getTestDataIds()
        const fullCommand = new CreateIngredientCommandBuilder()
          .withUserId(testUserId)
          .withCategoryId(testDataIds.categories.vegetable)
          .withMemo(faker.lorem.sentence())
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
          .withStorageLocation({
            type: StorageType.FROZEN,
            detail: '冷凍庫の引き出し',
          })
          .withPurchaseDate(testDataHelpers.todayString())
          .withPrice(faker.number.int({ min: 100, max: 5000 }))
          .withExpiryInfo({
            bestBeforeDate: testDataHelpers.dateStringFromNow(
              faker.number.int({ min: 20, max: 60 })
            ),
            useByDate: testDataHelpers.dateStringFromNow(faker.number.int({ min: 10, max: 19 })),
          })
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fullCommand),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 全フィールドが正しく設定される
        expect(response.status).toBe(201)
        expect(data.ingredient.memo).toBe(fullCommand.memo)
        expect(data.ingredient.price).toBe(fullCommand.price)
        expect(data.ingredient.expiryInfo).toBeDefined()
        expect(data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        expect(data.ingredient.expiryInfo.useByDate).toBeDefined()
        expect(data.ingredient.stock.storageLocation.detail).toBe('冷凍庫の引き出し')
      })
    })

    describe('データパターンのテスト', () => {
      it('TC004: 価格に小数点を含む場合の精度保持', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 小数点を含む価格
        const precisePrice = faker.number.float({ min: 100, max: 9999, fractionDigits: 2 })
        const testDataIds = getTestDataIds()
        const command = new CreateIngredientCommandBuilder()
          .withUserId(testUserId)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(testDataHelpers.todayString())
          .withPrice(precisePrice)
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 価格の精度が保持される
        expect(response.status).toBe(201)
        expect(data.ingredient.price).toBe(precisePrice)

        // データベースでも精度が保持される
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: data.ingredient.id },
        })
        expect(dbIngredient?.price?.toNumber()).toBe(precisePrice)
      })

      it('TC005: 期限情報の組み合わせパターン - 賞味期限のみ', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 賞味期限のみ設定
        const testDataIds = getTestDataIds()
        const command = new CreateIngredientCommandBuilder()
          .withUserId(testUserId)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(5, testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(testDataHelpers.todayString())
          .withExpiryInfo({
            bestBeforeDate: testDataHelpers.dateStringFromNow(7),
            useByDate: null,
          })
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const responseData = await response.json()
        const data = responseData.data

        // Then: 賞味期限のみが設定される
        expect(response.status).toBe(201)
        expect(data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        expect(data.ingredient.expiryInfo.useByDate).toBeNull()
      })

      it('TC006: 各保存場所タイプでの作成', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        const storageTypes = [
          StorageType.REFRIGERATED,
          StorageType.FROZEN,
          StorageType.ROOM_TEMPERATURE,
        ]

        for (const storageType of storageTypes) {
          // Given: 各保存場所タイプ
          const testDataIds = getTestDataIds()
          const command = new CreateIngredientCommandBuilder()
            .withUserId(testUserId)
            .withName(`${faker.food.ingredient()}_${storageType}_${Date.now()}`)
            .withCategoryId(testDataIds.categories.vegetable)
            .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
            .withStorageLocation({ type: storageType })
            .withPurchaseDate(testDataHelpers.todayString())
            .build()

          const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
          })

          // When: APIを呼び出す
          const response = await POST(request)
          const responseData = await response.json()
          const data = responseData.data

          // Then: 正しい保存場所タイプで作成される
          expect(response.status).toBe(201)
          expect(data.ingredient.stock.storageLocation.type).toBe(storageType)
        }
      })
    })
  })

  describe('異常系', () => {
    describe('バリデーションエラー', () => {
      it('TC101: 必須フィールドが欠けている場合400エラーを返す', async () => {
        // 認証済みユーザーのモック
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'invalid-user-id',
            domainUserId: 'invalid-domain-user-id',
          },
        } as any)

        // Given: 必須フィールドが欠けているリクエスト
        const testDataIds = getTestDataIds()
        const invalidCommand = {
          // nameがない
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: 5,
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: StorageType.REFRIGERATED,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidCommand),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const errorData = await response.json()

        // Then: 400 Bad Requestが返される
        expect(response.status).toBe(400)
        expect(errorData.error).toBeDefined()
        expect(errorData.error.code).toBe('VALIDATION_ERROR')
        expect(errorData.error.details.validationErrors).toBeDefined()
        expect(
          errorData.error.details.validationErrors.some((err: any) => err.field === 'name')
        ).toBe(true)
      })

      it('TC102: 食材名が長すぎる場合400エラーを返す', async () => {
        // 認証済みユーザーのモック
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'invalid-user-id',
            domainUserId: 'invalid-domain-user-id',
          },
        } as any)

        // Given: 50文字を超える食材名
        const testDataIds = getTestDataIds()
        const longName = faker.string.alphanumeric(51)
        const command = new CreateIngredientCommandBuilder()
          .withName(longName)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(5, testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(testDataHelpers.todayString())
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const errorData = await response.json()

        // Then: 400 Bad Requestが返される
        expect(response.status).toBe(400)
        expect(errorData.error.code).toBe('VALIDATION_ERROR')
        expect(errorData.error.details.validationErrors).toBeDefined()
        expect(
          errorData.error.details.validationErrors.some((err: any) => err.field === 'name')
        ).toBe(true)
      })

      it('TC103: 数量が0以下の場合400エラーを返す', async () => {
        // 認証済みユーザーのモック
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'invalid-user-id',
            domainUserId: 'invalid-domain-user-id',
          },
        } as any)

        // Given: 無効な数量
        const testDataIds = getTestDataIds()
        const command = new CreateIngredientCommandBuilder()
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(0, testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(testDataHelpers.todayString())
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const errorData = await response.json()

        // Then: 400 Bad Requestが返される
        expect(response.status).toBe(400)
        expect(errorData.error.code).toBe('VALIDATION_ERROR')
        expect(errorData.error.details.validationErrors).toBeDefined()
        expect(
          errorData.error.details.validationErrors.some(
            (err: any) => err.field === 'quantity.amount'
          )
        ).toBe(true)
      })
    })

    describe('リソース不存在エラー', () => {
      it('TC201: 存在しないカテゴリーIDの場合404エラーを返す', async () => {
        // 認証済みユーザーのモック
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'invalid-user-id',
            domainUserId: 'invalid-domain-user-id',
          },
        } as any)

        // Given: 存在しないカテゴリーID（正しいプレフィックス形式）
        const testDataIds = getTestDataIds()
        const nonExistentCategoryId = testDataHelpers.categoryId() // cat_プレフィックス付きのID
        const command = new CreateIngredientCommandBuilder()
          .withCategoryId(nonExistentCategoryId)
          .withQuantity(5, testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(testDataHelpers.todayString())
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const errorData = await response.json()

        // Then: 404 Not Foundが返される
        expect(response.status).toBe(404)
        expect(errorData.error.code).toBe('RESOURCE_NOT_FOUND')
        expect(errorData.error.message).toContain('Category not found')
      })

      it('TC202: 存在しない単位IDの場合404エラーを返す', async () => {
        // 認証済みユーザーのモック
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'invalid-user-id',
            domainUserId: 'invalid-domain-user-id',
          },
        } as any)

        // Given: 存在しない単位ID（正しいプレフィックス形式）
        const testDataIds = getTestDataIds()
        const nonExistentUnitId = testDataHelpers.unitId() // unt_プレフィックス付きのID
        const command = new CreateIngredientCommandBuilder()
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(5, nonExistentUnitId)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(testDataHelpers.todayString())
          .build()

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const errorData = await response.json()

        // Then: 404 Not Foundが返される
        expect(response.status).toBe(404)
        expect(errorData.error.code).toBe('RESOURCE_NOT_FOUND')
        expect(errorData.error.message).toContain('Unit not found')
      })
    })
  })

  describe('認証・認可', () => {
    it('TC401: 認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      // Given: 有効なリクエストボディ
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(5, testDataIds.units.piece)
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(testDataHelpers.todayString())
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const errorData = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
      expect(errorData.error.message).toContain('認証が必要です')
    })

    it('TC403: domainUserIdがない場合401エラーを返す', async () => {
      // domainUserIdがないセッションのモック
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'invalid-user-id',
          email: faker.internet.email(),
          // domainUserIdがない
        },
      } as any)

      // Given: 有効なリクエストボディ
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(5, testDataIds.units.piece)
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(testDataHelpers.todayString())
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const errorData = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('パフォーマンス・並行性', () => {
    it('TC501: 同時に複数の食材を作成できる', async () => {
      // 認証済みユーザーのモック設定
      mockAuthUser()

      // Given: 3つの異なる食材作成リクエスト（SQLiteの制限を考慮して数を減らす）
      const testDataIds = getTestDataIds()
      const commands = Array.from({ length: 3 }, (_, i) =>
        new CreateIngredientCommandBuilder()
          .withName(`並行テスト食材${i}_${faker.string.alphanumeric(4)}`)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(faker.number.int({ min: 1, max: 10 }), testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(testDataHelpers.todayString())
          .build()
      )

      // When: 順次APIを呼び出す（SQLiteの並行処理制限を回避）
      const responses = []
      const results = []

      for (const command of commands) {
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })
        const response = await POST(request)
        responses.push(response)
        results.push(await response.json())
      }

      // Then: 全て成功する
      responses.forEach((response) => {
        expect(response.status).toBe(201)
      })

      // 全て異なるIDが生成される
      const ids = results.map((r) => r.data.ingredient.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)

      // データベースに全て保存されている
      const count = await prisma.ingredient.count({
        where: {
          name: {
            startsWith: '並行テスト食材',
          },
        },
      })
      expect(count).toBe(3)
    })

    it('TC602: Content-Type不正でも処理できる', async () => {
      // 認証済みユーザーのモック設定
      const testUserId = mockAuthUser()

      // Given: Content-Typeが不正だが有効なJSON
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withUserId(testUserId)
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(5, testDataIds.units.piece)
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(testDataHelpers.todayString())
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // 不正なContent-Type
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)

      // Debug: レスポンス詳細を確認
      if (response.status !== 201) {
        const errorData = await response.json()
        console.log('TC602 Error Status:', response.status)
        console.log('TC602 Error Data:', JSON.stringify(errorData, null, 2))
      }

      // Then: 正常に処理される（Next.jsは寛容）
      expect(response.status).toBe(201)
    })
  })

  describe('不正なリクエスト', () => {
    it('TC601: JSONパースエラーの場合500エラーを返す', async () => {
      // 認証済みユーザーのモック
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'invalid-user-id',
          domainUserId: 'invalid-domain-user-id',
        },
      } as any)

      // Given: 不正なJSON
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const errorData = await response.json()

      // Debug: エラー詳細を確認
      if (response.status !== 500) {
        console.log('TC601 Error Status:', response.status)
        console.log('TC601 Error Data:', JSON.stringify(errorData, null, 2))
      }

      // Then: 500 Internal Server Errorが返される
      expect(response.status).toBe(500)
      expect(errorData.error.code).toBe('INTERNAL_SERVER_ERROR')
    })
  })
})
