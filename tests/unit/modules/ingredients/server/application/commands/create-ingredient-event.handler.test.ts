import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CreateIngredientCommand } from '@/modules/ingredients/server/application/commands/create-ingredient.command'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '@/modules/ingredients/server/domain/repositories/repository-factory.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import {
  StorageType,
  StorageLocation,
  UnitId,
} from '@/modules/ingredients/server/domain/value-objects'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import { CategoryBuilder, UnitBuilder, IngredientBuilder } from '@tests/__fixtures__/builders'

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

// モックイベントバス
const mockEventBus: EventBus = {
  publish: vi.fn(),
  publishAll: vi.fn(),
}

// モックリポジトリファクトリー
const mockRepositoryFactory: RepositoryFactory = {
  createIngredientRepository: vi.fn().mockReturnValue(mockIngredientRepository),
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

describe('CreateIngredientHandler - Event Publishing', () => {
  let handler: CreateIngredientHandler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new CreateIngredientHandler(
      mockIngredientRepository,
      mockCategoryRepository,
      mockUnitRepository,
      mockRepositoryFactory,
      mockTransactionManager as any,
      mockEventBus
    )
  })

  it('食材作成時にIngredientCreatedEventを発行する', async () => {
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
    await handler.execute(command)

    // Then: イベントが発行される
    expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1)

    // 発行されたイベントを確認
    const publishedEvents = (mockEventBus.publishAll as any).mock.calls[0][0]
    expect(publishedEvents).toHaveLength(1)

    const event = publishedEvents[0]
    expect(event.constructor.name).toBe('IngredientCreated')
    // aggregateIdは新しく生成されるので、形式のみチェック
    expect(event.aggregateId).toMatch(/^ing_[a-z0-9]{24}$/)
  })

  it('在庫不足の場合はStockLevelLowEventも発行する', async () => {
    // Given: 在庫が閾値以下の食材
    const category = new CategoryBuilder().build()
    const unit = new UnitBuilder().build()
    const lowStockIngredient = new IngredientBuilder()
      .withIngredientStock({
        quantity: 1, // 閾値(2)以下
        unitId: new UnitId(unit.getId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        threshold: 2,
      })
      .build()

    const command = new CreateIngredientCommand({
      userId: 'user-123',
      name: '在庫不足の食材',
      categoryId: category.getId(),
      quantity: {
        amount: 1, // 閾値以下
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
    mockIngredientRepository.save = vi.fn().mockResolvedValue(lowStockIngredient)

    // When: ハンドラーを実行
    await handler.execute(command)

    // Then: 2つのイベントが発行される
    expect(mockEventBus.publishAll).toHaveBeenCalledTimes(1)

    const publishedEvents = (mockEventBus.publishAll as any).mock.calls[0][0]
    expect(publishedEvents).toHaveLength(2)

    // イベントの種類を確認
    const eventTypes = publishedEvents.map((e: any) => e.constructor.name)
    expect(eventTypes).toContain('IngredientCreated')
    expect(eventTypes).toContain('StockLevelLow')
  })

  it('エラーが発生した場合はイベントを発行しない', async () => {
    // Given: 存在しないカテゴリー
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
      memo: undefined,
      price: undefined,
      purchaseDate: '2024-01-15',
      expiryInfo: null,
    })

    // カテゴリーが見つからない
    mockCategoryRepository.findById = vi.fn().mockResolvedValue(null)

    // When/Then: エラーが発生
    await expect(handler.execute(command)).rejects.toThrow()

    // イベントは発行されない
    expect(mockEventBus.publish).not.toHaveBeenCalled()
    expect(mockEventBus.publishAll).not.toHaveBeenCalled()
  })
})
