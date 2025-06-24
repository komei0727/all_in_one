import { createId } from '@paralleldrive/cuid2'
import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { POST } from '@/app/api/v1/ingredients/route'
import { StorageLocation, UnitType, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/prisma/client'

// Prismaクライアントのモック（統合されたIngredientエンティティ対応）
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
    },
    unit: {
      findUnique: vi.fn(),
    },
    ingredient: {
      create: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

describe('POST /api/v1/ingredients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('正常に食材を作成できる', async () => {
    // テストデータの準備（統合されたIngredientエンティティ対応）
    const categoryId = createId()
    const unitId = createId()
    const requestBody = {
      name: 'トマト',
      categoryId: categoryId,
      quantity: {
        amount: 3,
        unitId: unitId,
      },
      storageLocation: {
        type: 'REFRIGERATED',
        detail: '野菜室',
      },
      expiryInfo: {
        bestBeforeDate: '2024-12-31',
        useByDate: '2024-12-30', // 消費期限は賞味期限より前に設定
      },
      purchaseDate: '2024-12-20',
      price: 300,
      memo: '新鮮なトマト',
    }

    // モックの設定
    const mockCategory = {
      id: categoryId,
      name: '野菜',
      displayOrder: 1,
      isActive: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockUnit = {
      id: unitId,
      name: '個',
      symbol: '個',
      type: UnitType.COUNT,
      displayOrder: 1,
      isActive: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // 統合されたIngredientエンティティのモック（Prisma.Decimalをモック）
    const mockIngredient = {
      id: createId(),
      userId: createId(), // ユーザーIDを追加
      name: 'トマト',
      categoryId: categoryId,
      memo: '新鮮なトマト',
      price: new (class {
        toNumber() {
          return 300
        }
      })() as unknown as Prisma.Decimal, // Prisma.Decimalをモック
      purchaseDate: new Date('2024-12-20'),
      quantity: new (class {
        toNumber() {
          return 3
        }
      })() as unknown as Prisma.Decimal, // Prisma.Decimalをモック
      unitId: unitId,
      threshold: null,
      storageLocationType: StorageLocation.REFRIGERATED,
      storageLocationDetail: '野菜室',
      bestBeforeDate: new Date('2024-12-31'),
      useByDate: new Date('2024-12-30'),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }

    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(mockUnit)
    vi.mocked(prisma.ingredient.upsert).mockResolvedValue(mockIngredient)

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

    // レスポンスの検証（統合されたIngredientエンティティ対応）
    expect(response.status).toBe(201)
    expect(responseBody).toMatchObject({
      ingredient: {
        id: mockIngredient.id,
        name: 'トマト',
        memo: '新鮮なトマト',
        category: {
          id: mockCategory.id,
          name: mockCategory.name,
        },
        currentStock: {
          quantity: 3,
          unit: {
            id: mockUnit.id,
            name: '個',
            symbol: '個',
          },
          storageLocation: {
            type: 'REFRIGERATED',
            detail: '野菜室',
          },
          bestBeforeDate: '2024-12-31',
          useByDate: '2024-12-30',
          purchaseDate: '2024-12-20',
          price: 300,
          isInStock: true,
        },
      },
    })
  })

  it('カテゴリーが存在しない場合は404エラーを返す', async () => {
    // テストデータの準備
    const requestBody = {
      name: 'トマト',
      categoryId: createId(), // 存在しないが有効なCUID
      quantity: {
        amount: 3,
        unitId: createId(),
      },
      storageLocation: {
        type: 'REFRIGERATED',
      },
      purchaseDate: '2024-12-20',
    }

    // モックの設定
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue({
      id: createId(),
      name: '個',
      symbol: '個',
      type: UnitType.COUNT,
      displayOrder: 1,
      isActive: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
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
    expect(response.status).toBe(404)
    expect(responseBody).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('Category not found'),
      },
    })
  })

  it('バリデーションエラーの場合は400エラーを返す', async () => {
    // テストデータの準備（名前が空文字列）
    const requestBody = {
      name: '',
      categoryId: createId(),
      quantity: {
        amount: 3,
        unitId: createId(),
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
        message: expect.any(String),
      },
    })
  })

  it('不正なJSONの場合は500エラーを返す', async () => {
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
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
        timestamp: expect.any(String),
        path: '/api/v1/ingredients',
      },
    })
  })
})
