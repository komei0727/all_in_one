import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CreateIngredientCommand } from '@/modules/ingredients/server/application/commands/create-ingredient.command'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import type { IngredientDto } from '@/modules/ingredients/server/application/dtos/ingredient.dto'
import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import {
  CategoryBuilder,
  UnitBuilder,
  IngredientBuilder,
} from '../../../../../../__fixtures__/builders'

describe('CreateIngredientHandler - Response DTO', () => {
  let handler: CreateIngredientHandler

  // モックリポジトリ
  const mockIngredientRepository: IngredientRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    findDuplicates: vi.fn().mockResolvedValue([]),
    findByName: vi.fn(),
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

  const mockCategoryRepository: CategoryRepository = {
    findById: vi.fn(),
    findAllActive: vi.fn(),
  }

  const mockUnitRepository: UnitRepository = {
    findById: vi.fn(),
    findAllActive: vi.fn(),
  }

  const mockEventBus: EventBus = {
    publish: vi.fn(),
    publishAll: vi.fn(),
  }

  const mockTransactionManager: TransactionManager = {
    run: vi.fn().mockImplementation(async (fn) => {
      const txRepository = {
        ...mockIngredientRepository,
        save: mockIngredientRepository.save,
        findDuplicates: mockIngredientRepository.findDuplicates,
      }
      return fn(txRepository)
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new CreateIngredientHandler(
      mockIngredientRepository,
      mockCategoryRepository,
      mockUnitRepository,
      mockTransactionManager,
      mockEventBus
    )
  })

  it('IngredientDtoを返す', async () => {
    // Given: 新しい食材
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()
    const newIngredient = new IngredientBuilder().build()

    const command = new CreateIngredientCommand({
      userId: 'user-123',
      name: '新しい食材',
      categoryId: category.getId(),
      quantity: {
        amount: 3,
        unitId: unit.getId(),
      },
      storageLocation: {
        type: StorageType.REFRIGERATED,
        detail: '野菜室',
      },
      threshold: 2,
      memo: 'テストメモ',
      price: 200,
      purchaseDate: '2024-01-15',
      expiryInfo: null,
    })

    // モックの設定
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)
    mockIngredientRepository.save = vi.fn().mockResolvedValue(newIngredient)

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: IngredientDtoが返される
    expect(result).toBeDefined()
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('category')
    expect(result).toHaveProperty('stock')

    // DTOの型チェック
    const dto = result as IngredientDto
    expect(dto.id).toBe(newIngredient.getId().getValue())
    expect(dto.name).toBe(newIngredient.getName().getValue())
    expect(dto.category).toEqual({
      id: category.getId(),
      name: category.getName(),
    })
    expect(dto.stock.unit).toEqual({
      id: unit.getId(),
      name: unit.getName(),
      symbol: unit.getSymbol(),
    })
  })

  it('カテゴリーと単位の情報が含まれている', async () => {
    // Given: 新しい食材
    const category = new CategoryBuilder().withName('野菜').build()
    const unit = new UnitBuilder().withName('個').withSymbol('個').build()
    const newIngredient = new IngredientBuilder().build()

    const command = new CreateIngredientCommand({
      userId: 'user-123',
      name: 'トマト',
      categoryId: category.getId(),
      quantity: {
        amount: 5,
        unitId: unit.getId(),
      },
      storageLocation: {
        type: StorageType.REFRIGERATED,
      },
      threshold: 3,
      purchaseDate: '2024-01-15',
      expiryInfo: null,
    })

    // モックの設定
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)
    mockIngredientRepository.save = vi.fn().mockResolvedValue(newIngredient)

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: カテゴリーと単位の情報が含まれている
    const dto = result as IngredientDto
    expect(dto.category?.name).toBe('野菜')
    expect(dto.stock.unit.name).toBe('個')
    expect(dto.stock.unit.symbol).toBe('個')
  })
})
