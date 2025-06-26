import { describe, expect, it, vi, beforeEach } from 'vitest'

import { IngredientListDto } from '@/modules/ingredients/server/application/dtos/ingredient-list.dto'
import { GetIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-ingredients.handler'
import { GetIngredientsQuery } from '@/modules/ingredients/server/application/queries/get-ingredients.query'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'

import { IngredientBuilder } from '../../../../__fixtures__/builders/entities/ingredient.builder'

describe('GetIngredientsHandler', () => {
  let handler: GetIngredientsHandler
  let mockRepository: IngredientRepository

  beforeEach(() => {
    mockRepository = {
      findMany: vi.fn(),
      count: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      findByUserId: vi.fn(),
      findExpiringSoon: vi.fn(),
      findExpired: vi.fn(),
      findByCategory: vi.fn(),
      findByStorageLocation: vi.fn(),
      findOutOfStock: vi.fn(),
      findLowStock: vi.fn(),
      existsByUserAndNameAndExpiryAndLocation: vi.fn(),
    }

    handler = new GetIngredientsHandler(mockRepository)
  })

  it('ページネーション付きで食材一覧を取得できる', async () => {
    // 食材エンティティを生成
    const ingredients = [
      new IngredientBuilder().withRandomName().withCategoryId('cat1').withDefaultStock().build(),
      new IngredientBuilder().withRandomName().withCategoryId('cat2').withDefaultStock().build(),
    ]

    // モックの設定
    vi.mocked(mockRepository.findMany).mockResolvedValue(ingredients)
    vi.mocked(mockRepository.count).mockResolvedValue(2)

    // クエリの実行
    const query = new GetIngredientsQuery('user1', 1, 20)
    const result = await handler.execute(query)

    // 検証
    expect(result).toBeInstanceOf(IngredientListDto)
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.totalPages).toBe(1)

    // リポジトリの呼び出し確認
    expect(mockRepository.findMany).toHaveBeenCalledWith({
      userId: 'user1',
      page: 1,
      limit: 20,
      search: undefined,
      categoryId: undefined,
      expiryStatus: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    })
    expect(mockRepository.count).toHaveBeenCalledWith({
      userId: 'user1',
      search: undefined,
      categoryId: undefined,
      expiryStatus: undefined,
    })
  })

  it('検索条件付きで食材を取得できる', async () => {
    const ingredient = new IngredientBuilder()
      .withName('トマト')
      .withCategoryId('cat1')
      .withDefaultStock()
      .build()

    vi.mocked(mockRepository.findMany).mockResolvedValue([ingredient])
    vi.mocked(mockRepository.count).mockResolvedValue(1)

    const query = new GetIngredientsQuery('user1', 1, 20, 'トマト', 'cat1', 'expired')
    const result = await handler.execute(query)

    expect(result.items).toHaveLength(1)
    expect(mockRepository.findMany).toHaveBeenCalledWith({
      userId: 'user1',
      page: 1,
      limit: 20,
      search: 'トマト',
      categoryId: 'cat1',
      expiryStatus: 'expired',
      sortBy: undefined,
      sortOrder: undefined,
    })
  })

  it('ソート条件付きで食材を取得できる', async () => {
    const ingredients = [
      new IngredientBuilder().withRandomName().withDefaultStock().build(),
      new IngredientBuilder().withRandomName().withDefaultStock().build(),
    ]

    vi.mocked(mockRepository.findMany).mockResolvedValue(ingredients)
    vi.mocked(mockRepository.count).mockResolvedValue(2)

    const query = new GetIngredientsQuery(
      'user1',
      1,
      20,
      undefined,
      undefined,
      undefined,
      'name',
      'asc'
    )
    const result = await handler.execute(query)

    expect(result.items).toHaveLength(2)
    expect(mockRepository.findMany).toHaveBeenCalledWith({
      userId: 'user1',
      page: 1,
      limit: 20,
      search: undefined,
      categoryId: undefined,
      expiryStatus: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    })
  })

  it('空の結果を返すことができる', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([])
    vi.mocked(mockRepository.count).mockResolvedValue(0)

    const query = new GetIngredientsQuery('user1', 1, 20)
    const result = await handler.execute(query)

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(0)
  })
})
