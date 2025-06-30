import { NextRequest } from 'next/server'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/[id]/route'
import { auth } from '@/auth'
import { GetIngredientByIdApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredient-by-id.handler'
import {
  IngredientNotFoundException,
  ValidationException,
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

vi.mock('@/modules/ingredients/server/api/handlers/queries/get-ingredient-by-id.handler', () => ({
  GetIngredientByIdApiHandler: vi.fn(),
}))

describe('GET /api/v1/ingredients/[id]', () => {
  let mockGetIngredientByIdHandler: any
  let mockCompositionRoot: any
  let mockApiHandler: any

  beforeEach(() => {
    vi.clearAllMocks()

    // ハンドラーのモック
    mockGetIngredientByIdHandler = {
      execute: vi.fn(),
    }

    // APIハンドラーのモック
    mockApiHandler = {
      handle: vi.fn(),
    }

    // CompositionRootのモック
    mockCompositionRoot = {
      getGetIngredientByIdHandler: vi.fn().mockReturnValue(mockGetIngredientByIdHandler),
    }

    // CompositionRoot.getInstanceのモック
    vi.mocked(CompositionRoot.getInstance).mockReturnValue(mockCompositionRoot)

    // GetIngredientByIdApiHandlerのモック
    vi.mocked(GetIngredientByIdApiHandler).mockImplementation(() => mockApiHandler)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('認証されていない場合は401エラーを返す', async () => {
    // 認証されていない状態をモック
    vi.mocked(auth).mockResolvedValue(null as any)

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/test-id', {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) })

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

  it('正常に食材詳細を取得できる', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 食材データのモック
    const mockIngredientDto = anIngredientDto().build()
    mockApiHandler.handle.mockResolvedValue(mockIngredientDto.toJSON())

    // リクエストの作成
    const ingredientId = mockIngredientDto.toJSON().ingredient.id
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: Promise.resolve({ id: ingredientId }) })

    // レスポンスの検証
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(mockIngredientDto.toJSON())

    // ハンドラーが正しく呼ばれたことを検証
    expect(mockApiHandler.handle).toHaveBeenCalledWith({ id: ingredientId }, mockUser.domainUserId)
  })

  it('食材が見つからない場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // IngredientNotFoundExceptionをスロー
    mockApiHandler.handle.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const notFoundId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${notFoundId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: Promise.resolve({ id: notFoundId }) })

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

  it('無効なUUID形式のIDの場合は400エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // ValidationExceptionをスロー
    mockApiHandler.handle.mockRejectedValue(new ValidationException('無効なIDです'))

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/invalid-id', {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid-id' }) })

    // レスポンスの検証
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '無効なIDです',
        timestamp: expect.any(String),
        path: '/api/v1/ingredients/invalid-id',
      },
    })
  })

  it('予期しないエラーの場合は500エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 予期しないエラーをスロー
    mockApiHandler.handle.mockRejectedValue(new Error('Unexpected error'))

    // リクエストの作成
    const validId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${validId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: Promise.resolve({ id: validId }) })

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

  it('削除済みの食材の場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 削除済みの食材のIDを生成
    const deletedId = faker.string.uuid()

    mockApiHandler.handle.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${deletedId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: Promise.resolve({ id: deletedId }) })

    // レスポンスの検証
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '食材が見つかりません',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${deletedId}`,
      },
    })
  })

  it('他のユーザーの食材を取得しようとした場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 他のユーザーの食材として404エラーをスロー
    mockApiHandler.handle.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const otherId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${otherId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: Promise.resolve({ id: otherId }) })

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
})
