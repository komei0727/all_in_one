import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as createIngredient } from '@/app/api/v1/ingredients/route'
import { PUT as completeShoppingSession } from '@/app/api/v1/shopping-sessions/[sessionId]/complete/route'
import { auth } from '@/auth'
import { IngredientBuilder } from '@tests/__fixtures__/builders/entities/ingredient.builder'
import { UserBuilder } from '@tests/__fixtures__/builders/entities/user.builder'

// auth関数をモック
vi.mock('@/auth')

describe('Route層の例外フロー統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('認証エラーのフロー', () => {
    it('認証されていない場合、401エラーが返される', async () => {
      // Given: 認証されていないユーザー
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest('http://localhost/api/v1/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      // When: APIを呼び出す
      const response = await createIngredient(request)

      // Then: 401エラーが返される
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: expect.any(String),
          path: expect.stringContaining('/api/v1/ingredients'),
        },
      })
    })
  })

  describe('バリデーションエラーのフロー', () => {
    it('無効なリクエストの場合、400エラーが返される', async () => {
      // Given: 認証されたユーザーと無効なリクエスト
      const user = new UserBuilder().build()
      vi.mocked(auth).mockResolvedValue({
        user: { domainUserId: user.id.value },
        expires: faker.date.future().toISOString(),
      } as any)

      const request = new NextRequest('http://localhost/api/v1/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 必須フィールドが不足
          categoryId: 'cat_invalid',
        }),
      })

      // When: APIを呼び出す
      const response = await createIngredient(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          timestamp: expect.any(String),
          path: expect.stringContaining('/api/v1/ingredients'),
        },
      })
    })
  })

  describe('ドメイン例外のフロー', () => {
    it('存在しないリソースの場合、404エラーが返される', async () => {
      // Given: 認証されたユーザーと存在しないセッションID
      const user = new UserBuilder().build()
      vi.mocked(auth).mockResolvedValue({
        user: { domainUserId: user.id.value },
        expires: faker.date.future().toISOString(),
      } as any)

      const nonExistentSessionId = 'ses_' + faker.string.alphanumeric(24)
      const request = new NextRequest(
        `http://localhost/api/v1/shopping-sessions/${nonExistentSessionId}/complete`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      // When: APIを呼び出す
      const response = await completeShoppingSession(request, {
        params: { sessionId: nonExistentSessionId },
      } as any)

      // Then: 404エラーが返される
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body).toMatchObject({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: expect.any(String),
          timestamp: expect.any(String),
          path: expect.stringContaining('/shopping-sessions/'),
        },
      })
    })
  })

  describe('予期しないエラーのフロー', () => {
    it('内部エラーの場合、500エラーが返される', async () => {
      // Given: 認証されたユーザーと内部エラーを発生させる設定
      const user = new UserBuilder().build()
      vi.mocked(auth).mockResolvedValue({
        user: { domainUserId: user.id.value },
        expires: faker.date.future().toISOString(),
      } as any)

      // リクエストボディを不正な形式にして内部エラーを誘発
      const request = new NextRequest('http://localhost/api/v1/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      // When: APIを呼び出す
      const response = await createIngredient(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body).toMatchObject({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: expect.any(String),
          timestamp: expect.any(String),
          path: expect.stringContaining('/api/v1/ingredients'),
        },
      })
    })
  })

  describe('成功レスポンスのフロー', () => {
    it('正常なリクエストの場合、成功レスポンスが返される', async () => {
      // Given: 認証されたユーザーと有効なリクエスト
      const user = new UserBuilder().build()
      vi.mocked(auth).mockResolvedValue({
        user: { domainUserId: user.id.value },
        expires: faker.date.future().toISOString(),
      } as any)

      const ingredientData = new IngredientBuilder().build()
      const request = new NextRequest('http://localhost/api/v1/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingredientData.getName().getValue(),
          categoryId: 'cat1', // テスト用の固定カテゴリID
          quantity: {
            amount: ingredientData.getIngredientStock().getQuantity(),
            unitId: 'unit1', // テスト用の固定単位ID
          },
          storageLocation: {
            type: ingredientData.getIngredientStock().getStorageLocation().getType(),
            detail: ingredientData.getIngredientStock().getStorageLocation().getDetail() || '',
          },
          purchaseDate: ingredientData.getPurchaseDate().toISOString().split('T')[0],
        }),
      })

      // When: APIを呼び出す
      const response = await createIngredient(request)

      // Then: 201 Createdが返される
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body).toMatchObject({
        ingredient: {
          id: expect.stringMatching(/^ing_[a-z0-9]{24}$/),
          name: ingredientData.getName().getValue(),
          userId: user.id.value,
        },
      })
    })
  })
})
