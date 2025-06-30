import { NextRequest } from 'next/server'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { GET } from '@/app/api/v1/ingredients/[id]/route'
import { auth } from '@/auth'
import { IngredientNotFoundException } from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

import { anIngredientDto } from '../../../../../../__fixtures__/builders/dtos/ingredient.dto.builder'
import { faker } from '../../../../../../__fixtures__/builders/faker.config'
import { NextAuthUserBuilder } from '../../../../../../__fixtures__/builders/next-auth/next-auth-user.builder'

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

describe('GET /api/v1/ingredients/[id]', () => {
  let mockGetIngredientByIdHandler: any
  let mockCompositionRoot: any

  beforeEach(() => {
    vi.clearAllMocks()

    // ハンドラーのモック
    mockGetIngredientByIdHandler = {
      execute: vi.fn(),
    }

    // CompositionRootのモック
    mockCompositionRoot = {
      getGetIngredientByIdHandler: vi.fn().mockReturnValue(mockGetIngredientByIdHandler),
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
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: { id: 'test-id' } })

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
    mockGetIngredientByIdHandler.execute.mockResolvedValue(mockIngredientDto)

    // リクエストの作成
    const ingredientId = mockIngredientDto.toJSON().ingredient.id
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: { id: ingredientId } })

    // レスポンスの検証
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(mockIngredientDto.toJSON())

    // ハンドラーが正しく呼ばれたことを検証
    expect(mockGetIngredientByIdHandler.execute).toHaveBeenCalledWith({
      userId: mockUser.domainUserId,
      id: ingredientId,
    })
  })

  it('食材が見つからない場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // IngredientNotFoundExceptionをスロー
    mockGetIngredientByIdHandler.execute.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const notFoundId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${notFoundId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: { id: notFoundId } })

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

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/invalid-id', {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: { id: 'invalid-id' } })

    // レスポンスの検証
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '無効なIDフォーマットです',
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
    mockGetIngredientByIdHandler.execute.mockRejectedValue(new Error('Unexpected error'))

    // リクエストの作成
    const validId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${validId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: { id: validId } })

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

    mockGetIngredientByIdHandler.execute.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${deletedId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: { id: deletedId } })

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
    mockGetIngredientByIdHandler.execute.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const otherId = faker.string.uuid()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${otherId}`, {
      method: 'GET',
    })

    // ハンドラーの実行
    const response = await GET(request, { params: { id: otherId } })

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
