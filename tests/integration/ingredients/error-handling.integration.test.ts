import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { DELETE, GET, PUT } from '@/app/api/v1/ingredients/[id]/route'
import { POST } from '@/app/api/v1/ingredients/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
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
 * Error Handling統合テスト
 *
 * 各種エラーケースの統合テスト
 * - 認証エラー
 * - バリデーションエラー
 * - リクエスト形式エラー
 */
describe('Error Handling Integration Tests', () => {
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
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを閉じる
    await cleanupPrismaClient()
  })

  describe('認証エラー', () => {
    describe('未認証', () => {
      it('TC401: POST /ingredients - 認証されていない場合（401エラー）', async () => {
        // Given: 認証されていない（authがnullを返す）
        vi.mocked(auth).mockResolvedValue(null as any)

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: faker.food.ingredient(),
            categoryId: 'cat_12345',
            quantity: { amount: 100, unitId: 'unit_1' },
            storageLocation: { type: 'REFRIGERATED' },
          }),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const data = await response.json()

        // Then: 401 Unauthorized
        expect(response.status).toBe(401)
        expect(data.error).toMatchObject({
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('認証が必要です'),
          type: 'VALIDATION_ERROR',
        })
      })

      it('TC402: GET /ingredients/{id} - 無効なトークン（401エラー）', async () => {
        // Given: 不正なユーザー情報（domainUserIdなし）
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'invalid-user-id',
            email: faker.internet.email(),
            // domainUserIdがない
          },
        } as any)

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients/ing_12345', {
          method: 'GET',
        })

        // When: APIを呼び出す
        const response = await GET(request, { params: Promise.resolve({ id: 'ing_12345' }) })
        const data = await response.json()

        // Then: 401 Unauthorized
        expect(response.status).toBe(401)
        expect(data.error.code).toBe('UNAUTHORIZED')
      })

      it('TC403: DELETE /ingredients/{id} - domainUserIdがない場合（401エラー）', async () => {
        // Given: NextAuthのユーザー情報にdomainUserIdが含まれない
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'auth-user-id',
            email: faker.internet.email(),
            name: faker.person.fullName(),
            // domainUserIdが未定義
          },
        } as any)

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients/ing_12345', {
          method: 'DELETE',
        })

        // When: APIを呼び出す
        const response = await DELETE(request, { params: Promise.resolve({ id: 'ing_12345' }) })
        const data = await response.json()

        // Then: 401 Unauthorized
        expect(response.status).toBe(401)
        expect(data.error).toMatchObject({
          code: 'UNAUTHORIZED',
          type: 'VALIDATION_ERROR',
        })
      })
    })
  })

  describe('バリデーションエラー', () => {
    beforeEach(() => {
      // 認証ユーザーをモック
      const testDataIds = getTestDataIds()
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: testDataIds.users.defaultUser.nextAuthId,
          email: testDataIds.users.defaultUser.email,
          domainUserId: testDataIds.users.defaultUser.domainUserId,
        },
      } as any)
    })

    describe('必須フィールドの欠落', () => {
      it('TC201: POST /ingredients - 必須フィールドの欠落（400エラー）', async () => {
        // Given: nameフィールドが欠落
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // nameが欠落
            categoryId: 'cat_12345',
            quantity: { amount: 100, unitId: 'unit_1' },
            storageLocation: { type: 'REFRIGERATED' },
          }),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const data = await response.json()

        // Then: 400 Bad Request
        expect(response.status).toBe(400)
        expect(data.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          type: 'VALIDATION_ERROR',
        })
      })

      it('TC202: PUT /ingredients/{id} - 部分更新での型エラー（400エラー）', async () => {
        // Given: quantityに文字列を指定
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients/ing_12345', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stock: {
              quantity: 'invalid-number', // 数値でなければならない
              unitId: 'unit_1',
            },
          }),
        })

        // When: APIを呼び出す
        const response = await PUT(request, { params: Promise.resolve({ id: 'ing_12345' }) })
        const data = await response.json()

        // Then: 400 Bad Request
        expect(response.status).toBe(400)
        expect(data.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          type: 'VALIDATION_ERROR',
        })
      })
    })

    describe('不正な値', () => {
      it('TC203: POST /ingredients - 不正な保存場所タイプ（400エラー）', async () => {
        // Given: 存在しないstorageLocation.type
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: faker.food.ingredient(),
            categoryId: 'cat_12345',
            quantity: { amount: 100, unitId: 'unit_1' },
            storageLocation: { type: 'INVALID_TYPE' }, // 不正な値
          }),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const data = await response.json()

        // Then: 400 Bad Request
        expect(response.status).toBe(400)
        expect(data.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          type: 'VALIDATION_ERROR',
        })
      })

      it('TC204: POST /ingredients - 負の数量（400エラー）', async () => {
        // Given: quantityに負の値
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: faker.food.ingredient(),
            categoryId: 'cat_12345',
            quantity: { amount: -10, unitId: 'unit_1' }, // 負の値
            storageLocation: { type: 'REFRIGERATED' },
          }),
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const data = await response.json()

        // Then: 400 Bad Request
        expect(response.status).toBe(400)
        expect(data.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          type: 'VALIDATION_ERROR',
        })
      })
    })
  })

  describe('リクエスト形式エラー', () => {
    beforeEach(() => {
      // 認証ユーザーをモック
      const testDataIds = getTestDataIds()
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: testDataIds.users.defaultUser.nextAuthId,
          email: testDataIds.users.defaultUser.email,
          domainUserId: testDataIds.users.defaultUser.domainUserId,
        },
      } as any)
    })

    describe('JSONパースエラー', () => {
      it('TC301: POST /ingredients - 不正なJSON（400エラー）', async () => {
        // Given: 不正なJSON文字列
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: '{ invalid json }', // 不正なJSON
        })

        // When: APIを呼び出す
        const response = await POST(request)
        const data = await response.json()

        // Then: 500 Internal Server Error（本番環境では詳細を隠蔽）
        expect(response.status).toBe(500)
        expect(data.error).toMatchObject({
          code: 'INTERNAL_SERVER_ERROR',
          type: 'SYSTEM_ERROR',
        })
      })
    })

    describe('Content-Type処理', () => {
      it('TC302: POST /ingredients - Content-Type不正でも有効なJSONなら処理（寛容性）', async () => {
        // Given: Content-Typeがtext/plainだが、有効なJSON
        const testDataIds = getTestDataIds()
        const ingredientData = {
          name: faker.food.ingredient(),
          categoryId: testDataIds.categories.vegetable,
          quantity: {
            amount: faker.number.int({ min: 1, max: 10 }),
            unitId: testDataIds.units.piece,
          },
          storageLocation: {
            type: 'REFRIGERATED',
          },
          purchaseDate: new Date().toISOString().split('T')[0],
        }

        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain', // 不正なContent-Type
          },
          body: JSON.stringify(ingredientData), // 有効なJSON
        })

        // When: APIを呼び出す
        const response = await POST(request)

        // Then: 正常処理される（Next.jsの寛容性）
        expect(response.status).toBe(201)
        const data = await response.json()
        expect(data.data.ingredient).toMatchObject({
          name: ingredientData.name,
        })
      })
    })
  })

  describe('不正なID形式', () => {
    beforeEach(() => {
      // 認証ユーザーをモック
      const testDataIds = getTestDataIds()
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: testDataIds.users.defaultUser.nextAuthId,
          email: testDataIds.users.defaultUser.email,
          domainUserId: testDataIds.users.defaultUser.domainUserId,
        },
      } as any)
    })

    it('TC401: GET /ingredients/{id} - 無効なID形式（400エラー）', async () => {
      // Given: CUID形式ではないID
      const invalidId = 'invalid-id-format'

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${invalidId}`, {
        method: 'GET',
      })

      // When: APIを呼び出す
      const response = await GET(request, { params: Promise.resolve({ id: invalidId }) })
      const data = await response.json()

      // Then: 400 Bad Request
      expect(response.status).toBe(400)
      expect(data.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('無効なIDフォーマット'),
        type: 'VALIDATION_ERROR',
      })
    })

    it('TC402: DELETE /ingredients/{id} - 空のID（400エラー）', async () => {
      // Given: 空のID
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients/', {
        method: 'DELETE',
      })

      // When: APIを呼び出す
      const response = await DELETE(request, { params: Promise.resolve({ id: '' }) })
      const data = await response.json()

      // Then: 400 Bad Request
      expect(response.status).toBe(400)
      expect(data.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('IDは必須'),
        type: 'VALIDATION_ERROR',
      })
    })
  })
})
