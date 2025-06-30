import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CreateIngredientCommand } from '@/modules/ingredients/server/application/commands/create-ingredient.command'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { DuplicateIngredientException } from '@/modules/ingredients/server/domain/exceptions'
import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'

import { CategoryBuilder, UnitBuilder } from '../../../../../../__fixtures__/builders'

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

// モックイベントバス
const mockEventBus: EventBus = {
  publish: vi.fn(),
  publishAll: vi.fn(),
}

// モックトランザクションマネージャー
const mockTransactionManager = {
  run: vi.fn().mockImplementation(async (fn) => {
    const txRepository = {
      ...mockIngredientRepository,
      save: mockIngredientRepository.save,
      findDuplicates: mockIngredientRepository.findDuplicates,
    }
    return fn(txRepository)
  }),
}

describe('CreateIngredientHandler - Duplicate Check', () => {
  let handler: CreateIngredientHandler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new CreateIngredientHandler(
      mockIngredientRepository,
      mockCategoryRepository,
      mockUnitRepository,
      mockTransactionManager as any,
      mockEventBus
    )
  })

  it('重複する食材が存在する場合はエラーを投げる', async () => {
    // Given: 既存の食材と同じ情報
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()
    const existingIngredient = new IngredientBuilder()
      .withName('トマト')
      .withUserId('user-123')
      .build()

    const command = new CreateIngredientCommand({
      userId: 'user-123',
      name: 'トマト',
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
      expiryInfo: {
        bestBeforeDate: '2024-01-25',
        useByDate: null,
      },
    })

    // モックの設定
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)

    // 重複する食材が存在する場合
    mockIngredientRepository.findDuplicates = vi.fn().mockResolvedValue([existingIngredient])

    // When/Then: DuplicateIngredientExceptionが投げられる
    await expect(handler.execute(command)).rejects.toThrow(DuplicateIngredientException)

    // 重複チェックが呼ばれたことを確認
    expect(mockIngredientRepository.findDuplicates).toHaveBeenCalledTimes(1)
    expect(mockIngredientRepository.findDuplicates).toHaveBeenCalledWith({
      userId: 'user-123',
      name: 'トマト',
      expiryInfo: {
        bestBeforeDate: new Date('2024-01-25'),
        useByDate: null,
      },
      storageLocation: {
        type: StorageType.REFRIGERATED,
        detail: '野菜室',
      },
    })

    // 保存は呼ばれない
    expect(mockIngredientRepository.save).not.toHaveBeenCalled()
  })

  it('重複する食材が存在しない場合は正常に作成される', async () => {
    // Given: 新しい食材
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()

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

    // 重複する食材が存在しない場合
    mockIngredientRepository.findDuplicates = vi.fn().mockResolvedValue([])
    mockIngredientRepository.save = vi.fn().mockImplementation(async (ingredient) => ingredient)

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: 正常に作成される
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.name).toBe(command.name)

    // 重複チェックが呼ばれたことを確認
    expect(mockIngredientRepository.findDuplicates).toHaveBeenCalledTimes(1)

    // 保存が呼ばれたことを確認
    expect(mockIngredientRepository.save).toHaveBeenCalledTimes(1)
  })

  it('期限情報が異なる場合は別の食材として扱われる', async () => {
    // Given: 同じ名前だが期限が異なる食材
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()

    const command = new CreateIngredientCommand({
      userId: 'user-123',
      name: 'トマト',
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
      expiryInfo: {
        bestBeforeDate: '2024-02-01', // 異なる期限
        useByDate: null,
      },
    })

    // モックの設定
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)

    // 重複する食材が存在しない（期限が異なるため）
    mockIngredientRepository.findDuplicates = vi.fn().mockResolvedValue([])
    mockIngredientRepository.save = vi.fn().mockImplementation(async (ingredient) => ingredient)

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: 正常に作成される
    expect(result).toBeDefined()

    // 重複チェックが呼ばれたことを確認
    expect(mockIngredientRepository.findDuplicates).toHaveBeenCalledWith({
      userId: 'user-123',
      name: 'トマト',
      expiryInfo: {
        bestBeforeDate: new Date('2024-02-01'),
        useByDate: null,
      },
      storageLocation: {
        type: StorageType.REFRIGERATED,
        detail: '野菜室',
      },
    })
  })
})
