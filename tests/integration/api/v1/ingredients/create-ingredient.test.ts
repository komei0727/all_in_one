import { StorageLocation, UnitType } from '@prisma/client'
import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { POST } from '@/app/api/v1/ingredients/route'
import { prisma } from '@/lib/prisma/client'

// Prismaクライアントのモック
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    $transaction: vi.fn(),
    category: {
      findUnique: vi.fn(),
    },
    unit: {
      findUnique: vi.fn(),
    },
    ingredient: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    ingredientStock: {
      create: vi.fn(),
      findFirst: vi.fn(),
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
      bestBeforeDate: '2024-12-31',
      expiryDate: '2025-01-05',
      purchaseDate: '2024-12-20',
      price: 300,
      memo: '新鮮なトマト',
    }

    // モックの設定
    const mockCategory = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: '野菜',
      displayOrder: 1,
      isActive: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockUnit = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: '個',
      symbol: '個',
      type: UnitType.COUNT,
      displayOrder: 1,
      isActive: true,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockIngredient = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'トマト',
      categoryId: mockCategory.id,
      memo: '新鮮なトマト',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      category: mockCategory,
    }

    const mockStock = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      ingredientId: mockIngredient.id,
      quantity: 3,
      unitId: mockUnit.id,
      storageLocationType: StorageLocation.REFRIGERATED,
      storageLocationDetail: '野菜室',
      bestBeforeDate: new Date('2024-12-31'),
      expiryDate: new Date('2025-01-05'),
      purchaseDate: new Date('2024-12-20'),
      price: 300,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      unit: mockUnit,
    }

    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(mockUnit)
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      // トランザクション内で使用するモックprismaオブジェクト
      const txPrisma = {
        ingredient: {
          upsert: vi.fn().mockResolvedValue(mockIngredient),
        },
        ingredientStock: {
          create: vi.fn().mockResolvedValue(mockStock),
        },
      } as any
      return callback(txPrisma)
    })
    vi.mocked(prisma.ingredient.findUnique).mockResolvedValue(null)

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
      categoryId: '550e8400-e29b-41d4-a716-446655440999', // 存在しないが有効なUUID
      quantity: {
        amount: 3,
        unitId: '550e8400-e29b-41d4-a716-446655440001',
      },
      storageLocation: {
        type: 'REFRIGERATED',
      },
      purchaseDate: '2024-12-20',
    }

    // モックの設定
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440001',
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
        message: expect.any(String),
      },
    })
  })
})
