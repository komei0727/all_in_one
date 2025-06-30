import { describe, it, expect, beforeEach, vi } from 'vitest'

import { UpdateIngredientCommand } from '@/modules/ingredients/server/application/commands/update-ingredient.command'
import { UpdateIngredientHandler } from '@/modules/ingredients/server/application/commands/update-ingredient.handler'
import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import {
  CategoryBuilder,
  UnitBuilder,
  IngredientBuilder,
} from '../../../../../../__fixtures__/builders'

describe('UpdateIngredientHandler - Entity Methods', () => {
  let handler: UpdateIngredientHandler

  // モックリポジトリ
  const mockIngredientRepository: IngredientRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    findDuplicates: vi.fn(),
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

  const mockTransactionManager: TransactionManager = {
    run: vi.fn().mockImplementation(async (fn) => {
      const txRepository = {
        ...mockIngredientRepository,
        update: mockIngredientRepository.update,
      }
      return fn(txRepository)
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new UpdateIngredientHandler(
      mockIngredientRepository,
      mockCategoryRepository,
      mockUnitRepository,
      mockTransactionManager
    )
  })

  it('価格を更新できる', async () => {
    // Given: 既存の食材
    const existingIngredient = new IngredientBuilder().build()
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()

    mockIngredientRepository.findById = vi.fn().mockResolvedValue(existingIngredient)
    mockIngredientRepository.update = vi.fn().mockResolvedValue(existingIngredient)
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)

    const command = new UpdateIngredientCommand(
      existingIngredient.getId().getValue(),
      existingIngredient.getUserId(),
      undefined, // name
      undefined, // categoryId
      undefined, // memo
      300, // price
      undefined, // purchaseDate
      undefined, // expiryInfo
      undefined // stock
    )

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: updateが呼ばれる
    expect(mockIngredientRepository.update).toHaveBeenCalledTimes(1)
    expect(result).toBeDefined()
  })

  it('期限情報を更新できる', async () => {
    // Given: 既存の食材
    const existingIngredient = new IngredientBuilder().build()
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()

    mockIngredientRepository.findById = vi.fn().mockResolvedValue(existingIngredient)
    mockIngredientRepository.update = vi.fn().mockResolvedValue(existingIngredient)
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)

    const command = new UpdateIngredientCommand(
      existingIngredient.getId().getValue(),
      existingIngredient.getUserId(),
      undefined, // name
      undefined, // categoryId
      undefined, // memo
      undefined, // price
      undefined, // purchaseDate
      {
        bestBeforeDate: new Date('2024-02-15'),
        useByDate: new Date('2024-02-10'),
      }, // expiryInfo
      undefined // stock
    )

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: updateが呼ばれる
    expect(mockIngredientRepository.update).toHaveBeenCalledTimes(1)
    expect(result).toBeDefined()
  })

  it('価格をnullに更新できる', async () => {
    // Given: 既存の食材
    const existingIngredient = new IngredientBuilder().build()
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()

    mockIngredientRepository.findById = vi.fn().mockResolvedValue(existingIngredient)
    mockIngredientRepository.update = vi.fn().mockResolvedValue(existingIngredient)
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)

    const command = new UpdateIngredientCommand(
      existingIngredient.getId().getValue(),
      existingIngredient.getUserId(),
      undefined, // name
      undefined, // categoryId
      undefined, // memo
      null, // price
      undefined, // purchaseDate
      undefined, // expiryInfo
      undefined // stock
    )

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: updateが呼ばれる
    expect(mockIngredientRepository.update).toHaveBeenCalledTimes(1)
    expect(result).toBeDefined()
  })
})
