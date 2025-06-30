import { NextRequest } from 'next/server'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { PUT } from '@/app/api/v1/ingredients/[id]/route'
import { auth } from '@/auth'
import {
  IngredientNotFoundException,
  ValidationException,
  BusinessRuleException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { anIngredientDto } from '@tests/__fixtures__/builders/dtos/ingredient.dto.builder'
import { faker } from '@tests/__fixtures__/builders/faker.config'
import { NextAuthUserBuilder } from '@tests/__fixtures__/builders/next-auth/next-auth-user.builder'

const aNextAuthUser = () => new NextAuthUserBuilder()

// モジュールのモック
vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('PUT /api/v1/ingredients/[id]', () => {
  let mockUpdateIngredientApiHandler: any
  let mockCompositionRoot: any

  beforeEach(() => {
    vi.clearAllMocks()

    // APIハンドラーのモック
    mockUpdateIngredientApiHandler = {
      handle: vi.fn(),
    }

    // CompositionRootのモック
    mockCompositionRoot = {
      getUpdateIngredientApiHandler: vi.fn().mockReturnValue(mockUpdateIngredientApiHandler),
    }

    // CompositionRoot.getInstanceのモック
    vi.mocked(CompositionRoot.getInstance).mockReturnValue(mockCompositionRoot)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('認証されていない場合は401エラーを返す', async () => {
    // 認証されていない状態をモック
    vi.mocked(auth).mockResolvedValue(null as any)

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/test-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '更新されたトマト',
      }),
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) })

    // レスポンスの検証
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
        timestamp: expect.any(String),
        path: '/api/v1/ingredients/test-id',
      },
    })
  })

  it('正常に食材を更新できる', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 更新後の食材データのモック
    const updatedIngredientDto = anIngredientDto().withName('更新されたトマト').build()
    mockUpdateIngredientApiHandler.handle.mockResolvedValue(updatedIngredientDto)

    // リクエストの作成
    const ingredientId = updatedIngredientDto.id
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '更新されたトマト',
        categoryId: 'cat1',
        memo: '新しいメモ',
        price: 200,
        expiryInfo: {
          bestBeforeDate: '2024-12-31',
          useByDate: null,
        },
        stock: {
          quantity: 5,
          unitId: 'unit1',
          storageLocation: {
            type: 'REFRIGERATED',
            detail: '冷蔵庫の野菜室',
          },
          threshold: 2,
        },
      }),
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: ingredientId }) })

    // レスポンスの検証
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(updatedIngredientDto.toJSON())

    // ハンドラーが正しく呼ばれたことを検証
    expect(mockUpdateIngredientApiHandler.handle).toHaveBeenCalledWith(
      {
        name: '更新されたトマト',
        categoryId: 'cat1',
        memo: '新しいメモ',
        price: 200,
        expiryInfo: {
          bestBeforeDate: '2024-12-31',
          useByDate: null,
        },
        stock: {
          quantity: 5,
          unitId: 'unit1',
          storageLocation: {
            type: 'REFRIGERATED',
            detail: '冷蔵庫の野菜室',
          },
          threshold: 2,
        },
      },
      ingredientId,
      mockUser.domainUserId
    )
  })

  it('バリデーションエラーの場合は400エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // ValidationExceptionをスロー
    mockUpdateIngredientApiHandler.handle.mockRejectedValue(
      new ValidationException('食材名は必須です')
    )

    // リクエストの作成
    const ingredientId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '', // 空の名前
      }),
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: ingredientId }) })

    // レスポンスの検証
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '食材名は必須です',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${ingredientId}`,
      },
    })
  })

  it('食材が見つからない場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // IngredientNotFoundExceptionをスロー
    mockUpdateIngredientApiHandler.handle.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const notFoundId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${notFoundId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '存在しない食材',
      }),
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: notFoundId }) })

    // レスポンスの検証
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '食材が見つかりません',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${notFoundId}`,
      },
    })
  })

  it('他のユーザーの食材を更新しようとした場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 他のユーザーの食材として404エラーをスロー
    mockUpdateIngredientApiHandler.handle.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const otherId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${otherId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '他のユーザーの食材',
      }),
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: otherId }) })

    // レスポンスの検証
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '食材が見つかりません',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${otherId}`,
      },
    })
  })

  it('ビジネスルール違反の場合は422エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // BusinessRuleExceptionをスロー
    mockUpdateIngredientApiHandler.handle.mockRejectedValue(
      new BusinessRuleException('削除済みの食材は更新できません')
    )

    // リクエストの作成
    const deletedId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${deletedId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '削除済みの食材',
      }),
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: deletedId }) })

    // レスポンスの検証
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: '削除済みの食材は更新できません',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${deletedId}`,
      },
    })
  })

  it('予期しないエラーの場合は500エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 予期しないエラーをスロー
    mockUpdateIngredientApiHandler.handle.mockRejectedValue(new Error('Unexpected error'))

    // リクエストの作成
    const validId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${validId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'テスト食材',
      }),
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: validId }) })

    // レスポンスの検証
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${validId}`,
      },
    })
  })

  it('無効なJSONの場合は400エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // リクエストの作成（無効なJSON）
    const ingredientId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    })

    // ハンドラーの実行
    const response = await PUT(request, { params: Promise.resolve({ id: ingredientId }) })

    // レスポンスの検証
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '無効なリクエストボディです',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${ingredientId}`,
      },
    })
  })
})
