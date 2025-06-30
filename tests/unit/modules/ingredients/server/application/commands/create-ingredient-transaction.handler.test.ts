import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CreateIngredientCommand } from '@/modules/ingredients/server/application/commands/create-ingredient.command'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import { CategoryBuilder, UnitBuilder } from '../../../../../../__fixtures__/builders'

// モックリポジトリ
const mockIngredientRepository: IngredientRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  findDuplicates: vi.fn().mockResolvedValue([]), // 重複なしをデフォルトに
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
const mockTransactionManager: TransactionManager = {
  run: vi.fn(),
}

describe('CreateIngredientHandler with Transaction', () => {
  let handler: CreateIngredientHandler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new CreateIngredientHandler(
      mockIngredientRepository,
      mockCategoryRepository,
      mockUnitRepository,
      mockTransactionManager as TransactionManager,
      mockEventBus
    )
  })

  it('トランザクション内で食材を作成する', async () => {
    // Given: テストデータ
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
      expiryInfo: {
        bestBeforeDate: '2024-01-25',
        useByDate: null,
      },
    })

    // モックの設定
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(category)
    mockUnitRepository.findById = vi.fn().mockResolvedValue(unit)
    mockIngredientRepository.save = vi.fn().mockImplementation(async (ingredient) => ingredient)

    // トランザクションマネージャーのモック設定
    mockTransactionManager.run = vi.fn().mockImplementation(async (fn) => {
      // トランザクション内でリポジトリのような動作をするモックオブジェクトを渡す
      const txRepository = {
        ...mockIngredientRepository,
        save: mockIngredientRepository.save,
        findDuplicates: mockIngredientRepository.findDuplicates,
      }
      return fn(txRepository)
    })

    // When: ハンドラーを実行
    const result = await handler.execute(command)

    // Then: トランザクション内で実行される
    expect(mockTransactionManager.run).toHaveBeenCalledTimes(1)
    expect(mockIngredientRepository.save).toHaveBeenCalledTimes(1)
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.name).toBe(command.name)
  })

  it('エラー時にロールバックされる', async () => {
    // Given: テストデータ
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

    // 保存時にエラーを発生させる
    const saveError = new Error('Database error')
    mockIngredientRepository.save = vi.fn().mockRejectedValue(saveError)

    // トランザクションマネージャーのモック設定（エラーを伝播）
    mockTransactionManager.run = vi.fn().mockImplementation(async (fn) => {
      const txRepository = {
        ...mockIngredientRepository,
        save: mockIngredientRepository.save,
        findDuplicates: mockIngredientRepository.findDuplicates,
      }
      return fn(txRepository)
    })

    // When/Then: エラーが発生し、ロールバックされる
    await expect(handler.execute(command)).rejects.toThrow('Database error')

    // トランザクションが呼ばれたことを確認
    expect(mockTransactionManager.run).toHaveBeenCalledTimes(1)
    expect(mockIngredientRepository.save).toHaveBeenCalledTimes(1)
  })

  it('トランザクション外の処理（検証）でエラーが発生した場合はトランザクションが開始されない', async () => {
    // Given: 存在しないカテゴリーID
    const command = new CreateIngredientCommand({
      userId: 'user-123',
      name: '新しい食材',
      categoryId: 'cat_xxxxxxxxxxxxxxxxxxxxxxxx',
      quantity: {
        amount: 3,
        unitId: 'unt_xxxxxxxxxxxxxxxxxxxxxxxx',
      },
      storageLocation: {
        type: StorageType.REFRIGERATED,
        detail: '野菜室',
      },
      threshold: 2,
      purchaseDate: '2024-01-15',
      memo: undefined,
      price: undefined,
      expiryInfo: null,
    })

    // カテゴリーが見つからない
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(null)

    // When/Then: CategoryNotFoundExceptionが投げられる
    await expect(handler.execute(command)).rejects.toThrow('Category not found')

    // トランザクションは開始されない
    expect(mockTransactionManager.run).not.toHaveBeenCalled()
    expect(mockIngredientRepository.save).not.toHaveBeenCalled()
  })
})
