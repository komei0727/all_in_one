import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { POST } from '@/app/api/v1/ingredients/route'
import { CreateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/create-ingredient.handler'
import { IngredientDto } from '@/modules/ingredients/server/application/dtos/ingredient.dto'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

// モジュールのモック
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(),
  },
}))

// NextAuthのインポート
const { getServerSession } = vi.mocked(await import('next-auth'))

describe('POST /api/v1/ingredients', () => {
  let mockApiHandler: CreateIngredientApiHandler
  let mockCompositionRoot: CompositionRoot

  beforeEach(() => {
    vi.clearAllMocks()

    // APIハンドラーのモック
    mockApiHandler = {
      handle: vi.fn(),
    } as unknown as CreateIngredientApiHandler

    // CompositionRootのモック
    mockCompositionRoot = {
      getCreateIngredientApiHandler: vi.fn().mockReturnValue(mockApiHandler),
    } as unknown as CompositionRoot

    // CompositionRoot.getInstanceのモック
    vi.mocked(CompositionRoot.getInstance).mockReturnValue(mockCompositionRoot)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('認証されていない場合は401エラーを返す', async () => {
    // 認証されていない状態をモック
    getServerSession.mockResolvedValue(null)

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'トマト' }),
    })

    // APIハンドラーの実行
    const response = await POST(request)
    const responseBody = await response.json()

    // レスポンスの検証
    expect(response.status).toBe(401)
    expect(responseBody).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
      },
    })
  })

  it('正常に食材を作成できる', async () => {
    // 認証済みユーザーをモック
    getServerSession.mockResolvedValue({
      user: {
        domainUserId: 'test-user-123',
        email: 'test@example.com',
      },
    })
    // テストデータの準備
    const requestBody = {
      name: 'トマト',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: {
        amount: 3,
        unitId: '550e8400-e29b-41d4-a716-446655440001',
      },
      storageLocation: {
        type: 'REFRIGERATED',
        detail: '野菜室',
      },
      expiryInfo: {
        bestBeforeDate: '2024-12-31',
        useByDate: '2025-01-05',
      },
      purchaseDate: '2024-12-20',
      price: 300,
      memo: '新鮮なトマト',
      threshold: 2,
    }

    // モックの設定
    const mockIngredientDto = new IngredientDto(
      '550e8400-e29b-41d4-a716-446655440002',
      'test-user-123',
      'トマト',
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '野菜',
      },
      300,
      '2024-12-20',
      {
        bestBeforeDate: '2024-12-31',
        useByDate: '2025-01-05',
      },
      {
        quantity: 3,
        unit: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: '個',
          symbol: '個',
        },
        storageLocation: {
          type: 'REFRIGERATED',
          detail: '野菜室',
        },
        threshold: 2,
      },
      '新鮮なトマト',
      new Date().toISOString(),
      new Date().toISOString()
    )

    vi.mocked(mockApiHandler.handle).mockResolvedValue({
      ingredient: mockIngredientDto,
    })

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // APIハンドラーの実行
    const response = await POST(request)
    const responseBody = await response.json()

    // レスポンスの検証
    expect(response.status).toBe(201)
    expect(responseBody).toMatchObject({
      ingredient: {
        id: mockIngredientDto.id,
        name: 'トマト',
        memo: '新鮮なトマト',
        userId: 'test-user-123',
        category: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: '野菜',
        },
        stock: {
          quantity: 3,
          unit: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: '個',
            symbol: '個',
          },
          storageLocation: {
            type: 'REFRIGERATED',
            detail: '野菜室',
          },
          threshold: 2,
        },
        price: 300,
        purchaseDate: '2024-12-20',
        expiryInfo: {
          bestBeforeDate: '2024-12-31',
          useByDate: '2025-01-05',
        },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    })

    // APIハンドラーが正しく呼ばれたことを確認
    expect(mockApiHandler.handle).toHaveBeenCalledWith(requestBody, 'test-user-123')
  })

  it('バリデーションエラーの場合は400エラーを返す', async () => {
    // 認証済みユーザーをモック
    getServerSession.mockResolvedValue({
      user: {
        domainUserId: 'test-user-123',
        email: 'test@example.com',
      },
    })

    // ValidationExceptionをインポート
    const { ValidationException } = await import(
      '@/modules/ingredients/server/domain/exceptions/validation.exception'
    )

    // モックの設定
    vi.mocked(mockApiHandler.handle).mockRejectedValue(
      new ValidationException('name: 食材名は必須です')
    )

    // テストデータの準備（名前が空文字列）
    const requestBody = {
      name: '',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: {
        amount: 3,
        unitId: '550e8400-e29b-41d4-a716-446655440001',
      },
      storageLocation: {
        type: 'REFRIGERATED',
      },
      purchaseDate: '2024-12-20',
    }

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // APIハンドラーの実行
    const response = await POST(request)
    const responseBody = await response.json()

    // レスポンスの検証
    expect(response.status).toBe(400)
    expect(responseBody).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'name: 食材名は必須です',
      },
    })
  })

  it('予期しないエラーの場合は500エラーを返す', async () => {
    // 認証済みユーザーをモック
    getServerSession.mockResolvedValue({
      user: {
        domainUserId: 'test-user-123',
        email: 'test@example.com',
      },
    })

    // モックの設定（予期しないエラー）
    vi.mocked(mockApiHandler.handle).mockRejectedValue(new Error('データベース接続エラー'))

    // テストデータの準備
    const requestBody = {
      name: 'トマト',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: {
        amount: 3,
        unitId: '550e8400-e29b-41d4-a716-446655440001',
      },
      storageLocation: {
        type: 'REFRIGERATED',
      },
      purchaseDate: '2024-12-20',
    }

    // リクエストの作成
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // APIハンドラーの実行
    const response = await POST(request)
    const responseBody = await response.json()

    // レスポンスの検証
    expect(response.status).toBe(500)
    expect(responseBody).toMatchObject({
      error: {
        message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
      },
    })
  })

  it('不正なJSONの場合は500エラーを返す', async () => {
    // 認証済みユーザーをモック
    getServerSession.mockResolvedValue({
      user: {
        domainUserId: 'test-user-123',
        email: 'test@example.com',
      },
    })
    // リクエストの作成（不正なJSON）
    const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{ invalid json',
    })

    // APIハンドラーの実行
    const response = await POST(request)
    const responseBody = await response.json()

    // レスポンスの検証
    expect(response.status).toBe(500)
    expect(responseBody).toMatchObject({
      error: {
        message: expect.any(String),
      },
    })
  })
})
