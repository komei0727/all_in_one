import { describe, expect, it, vi, beforeEach } from 'vitest'

import { IngredientListDto } from '@/modules/ingredients/server/application/dtos/ingredient-list.dto'
import { GetIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-ingredients.handler'
import { GetIngredientsQuery } from '@/modules/ingredients/server/application/queries/get-ingredients.query'
import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'

import { IngredientBuilder } from '../../../../../../__fixtures__/builders/entities/ingredient.builder'
import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('GetIngredientsHandler', () => {
  let handler: GetIngredientsHandler
  let mockIngredientRepository: IngredientRepository
  let mockCategoryRepository: CategoryRepository
  let mockUnitRepository: UnitRepository

  beforeEach(() => {
    mockIngredientRepository = {
      findMany: vi.fn(),
      count: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      save: vi.fn(),
      findAll: vi.fn(),
      findByUserId: vi.fn(),
      findExpiringSoon: vi.fn(),
      findExpired: vi.fn(),
      findByCategory: vi.fn(),
      findByStorageLocation: vi.fn(),
      findOutOfStock: vi.fn(),
      findLowStock: vi.fn(),
      findDuplicates: vi.fn(),
      update: vi.fn(),
      existsByUserAndNameAndExpiryAndLocation: vi.fn(),
    }

    mockCategoryRepository = {
      findById: vi.fn(),
      findAllActive: vi.fn(),
    }

    mockUnitRepository = {
      findById: vi.fn(),
      findAllActive: vi.fn(),
    }

    handler = new GetIngredientsHandler(
      mockIngredientRepository,
      mockCategoryRepository,
      mockUnitRepository
    )
  })

  it('ページネーション付きで食材一覧を取得できる', async () => {
    // 食材エンティティを生成
    const ingredients = [
      new IngredientBuilder()
        .withRandomName()
        .withCategoryId(testDataHelpers.categoryId())
        .withDefaultStock()
        .build(),
      new IngredientBuilder()
        .withRandomName()
        .withCategoryId(testDataHelpers.categoryId())
        .withDefaultStock()
        .build(),
    ]

    // モックの設定
    const findManyMock = mockIngredientRepository.findMany as ReturnType<typeof vi.fn>
    const countMock = mockIngredientRepository.count as ReturnType<typeof vi.fn>
    findManyMock.mockResolvedValue(ingredients)
    countMock.mockResolvedValue(2)

    // クエリの実行
    const userId = testDataHelpers.userId()
    const query = new GetIngredientsQuery(userId, 1, 20)
    const result = await handler.execute(query)

    // 検証
    expect(result).toBeInstanceOf(IngredientListDto)
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.totalPages).toBe(1)

    // リポジトリの呼び出し確認
    expect(mockIngredientRepository.findMany).toHaveBeenCalledWith({
      userId,
      page: 1,
      limit: 20,
      search: undefined,
      categoryId: undefined,
      expiryStatus: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    })
    expect(mockIngredientRepository.count).toHaveBeenCalledWith({
      userId,
      search: undefined,
      categoryId: undefined,
      expiryStatus: undefined,
    })
  })

  it('検索条件付きで食材を取得できる', async () => {
    const categoryId = testDataHelpers.categoryId()
    const ingredient = new IngredientBuilder()
      .withName('トマト')
      .withCategoryId(categoryId)
      .withDefaultStock()
      .build()

    const findManyMock = mockIngredientRepository.findMany as ReturnType<typeof vi.fn>
    const countMock = mockIngredientRepository.count as ReturnType<typeof vi.fn>
    findManyMock.mockResolvedValue([ingredient])
    countMock.mockResolvedValue(1)

    const userId = testDataHelpers.userId()
    const query = new GetIngredientsQuery(userId, 1, 20, 'トマト', categoryId, 'expired')
    const result = await handler.execute(query)

    expect(result.items).toHaveLength(1)
    expect(mockIngredientRepository.findMany).toHaveBeenCalledWith({
      userId,
      page: 1,
      limit: 20,
      search: 'トマト',
      categoryId,
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

    const findManyMock = mockIngredientRepository.findMany as ReturnType<typeof vi.fn>
    const countMock = mockIngredientRepository.count as ReturnType<typeof vi.fn>
    findManyMock.mockResolvedValue(ingredients)
    countMock.mockResolvedValue(2)

    const userId = testDataHelpers.userId()
    const query = new GetIngredientsQuery(
      userId,
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
    expect(mockIngredientRepository.findMany).toHaveBeenCalledWith({
      userId,
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
    const findManyMock = mockIngredientRepository.findMany as ReturnType<typeof vi.fn>
    const countMock = mockIngredientRepository.count as ReturnType<typeof vi.fn>
    findManyMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)

    const userId = testDataHelpers.userId()
    const query = new GetIngredientsQuery(userId, 1, 20)
    const result = await handler.execute(query)

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(0)
  })
})
