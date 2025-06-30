import { NextRequest } from 'next/server'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { DELETE } from '@/app/api/v1/ingredients/[id]/route'
import { auth } from '@/auth'
import {
  IngredientNotFoundException,
  BusinessRuleException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'
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

describe('DELETE /api/v1/ingredients/[id]', () => {
  let mockDeleteIngredientHandler: any
  let mockCompositionRoot: any

  beforeEach(() => {
    vi.clearAllMocks()

    // ハンドラーのモック
    mockDeleteIngredientHandler = {
      execute: vi.fn(),
    }

    // CompositionRootのモック
    mockCompositionRoot = {
      getDeleteIngredientHandler: vi.fn().mockReturnValue(mockDeleteIngredientHandler),
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
      method: 'DELETE',
    })

    // ハンドラーの実行
    const response = await DELETE(request, { params: { id: 'test-id' } })

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

  it('正常に食材を削除できる', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 削除成功をモック
    mockDeleteIngredientHandler.execute.mockResolvedValue(undefined)

    // リクエストの作成
    const ingredientId = testDataHelpers.ingredientId()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
      method: 'DELETE',
    })

    // ハンドラーの実行
    const response = await DELETE(request, { params: { id: ingredientId } })

    // レスポンスの検証
    expect(response.status).toBe(204)
    expect(response.body).toBeNull()

    // ハンドラーが正しく呼ばれたことを検証
    expect(mockDeleteIngredientHandler.execute).toHaveBeenCalledWith({
      id: ingredientId,
      userId: mockUser.domainUserId,
    })
  })

  it('食材が見つからない場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // IngredientNotFoundExceptionをスロー
    mockDeleteIngredientHandler.execute.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const notFoundId = testDataHelpers.ingredientId()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${notFoundId}`, {
      method: 'DELETE',
    })

    // ハンドラーの実行
    const response = await DELETE(request, { params: { id: notFoundId } })

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

  it('他のユーザーの食材を削除しようとした場合は404エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // 他のユーザーの食材として404エラーをスロー
    mockDeleteIngredientHandler.execute.mockRejectedValue(new IngredientNotFoundException())

    // リクエストの作成
    const otherId = testDataHelpers.ingredientId()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${otherId}`, {
      method: 'DELETE',
    })

    // ハンドラーの実行
    const response = await DELETE(request, { params: { id: otherId } })

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

  it('すでに削除済みの食材を削除しようとした場合は422エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // BusinessRuleExceptionをスロー
    mockDeleteIngredientHandler.execute.mockRejectedValue(
      new BusinessRuleException('すでに削除されています')
    )

    // リクエストの作成
    const deletedId = testDataHelpers.ingredientId()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${deletedId}`, {
      method: 'DELETE',
    })

    // ハンドラーの実行
    const response = await DELETE(request, { params: { id: deletedId } })

    // レスポンスの検証
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'すでに削除されています',
        timestamp: expect.any(String),
        path: `/api/v1/ingredients/${deletedId}`,
      },
    })
  })

  it('無効なUUID形式のIDの場合は400エラーを返す', async () => {
    // 認証済みユーザーをモック
    const mockUser = aNextAuthUser().build()
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as any)

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients/invalid-id', {
      method: 'DELETE',
    })

    // ハンドラーの実行
    const response = await DELETE(request, { params: { id: 'invalid-id' } })

    // レスポンスの検証
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '無効なIDフォーマットです。食材IDはing_で始まる必要があります',
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
    mockDeleteIngredientHandler.execute.mockRejectedValue(new Error('Unexpected error'))

    // リクエストの作成
    const validId = testDataHelpers.ingredientId()
    const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${validId}`, {
      method: 'DELETE',
    })

    // ハンドラーの実行
    const response = await DELETE(request, { params: { id: validId } })

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
})
