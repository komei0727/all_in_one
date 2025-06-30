import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import {
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { type CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import { type IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { type RepositoryFactory } from '@/modules/ingredients/server/domain/repositories/repository-factory.interface'
import { type UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'
import {
  CreateIngredientCommandBuilder,
  CategoryBuilder,
  UnitBuilder,
} from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'
import {
  createMockIngredientRepository,
  createMockCategoryRepository,
  createMockUnitRepository,
  createMockTransactionManager,
} from '@tests/__fixtures__/mocks/repositories'

describe('CreateIngredientHandler', () => {
  let handler: CreateIngredientHandler
  let ingredientRepository: IngredientRepository
  let categoryRepository: CategoryRepository
  let unitRepository: UnitRepository
  let repositoryFactory: RepositoryFactory
  let transactionManager: TransactionManager
  let eventBus: EventBus

  beforeEach(() => {
    // モックリポジトリの作成
    ingredientRepository = createMockIngredientRepository()
    categoryRepository = createMockCategoryRepository()
    unitRepository = createMockUnitRepository()
    repositoryFactory = {
      createIngredientRepository: vi.fn().mockReturnValue(ingredientRepository),
    }
    transactionManager = createMockTransactionManager()

    // イベントバスのモックを作成
    eventBus = {
      publish: vi.fn(),
      publishAll: vi.fn(),
    }

    // トランザクションマネージャーのモックを設定
    vi.mocked(transactionManager.run).mockImplementation(async (fn) => {
      // PrismaClientの最小限のモックを作成
      const mockPrismaClient = {} as any
      return fn(mockPrismaClient)
    })

    handler = new CreateIngredientHandler(
      ingredientRepository,
      categoryRepository,
      unitRepository,
      repositoryFactory,
      transactionManager,
      eventBus
    )
  })

  describe('execute', () => {
    it('食材を正常に作成できる', async () => {
      // Arrange
      // ビルダーを使用してテストデータを作成
      const command = new CreateIngredientCommandBuilder().withFullData().build()

      const mockCategory = new CategoryBuilder().build()
      const mockUnit = new UnitBuilder().build()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit)
      vi.mocked(ingredientRepository.findDuplicates).mockResolvedValue([])
      vi.mocked(ingredientRepository.save).mockImplementation(async (ingredient) => ingredient)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeDefined()
      expect(result.name).toBe(command.name)
      expect(result.category?.id).toBe(mockCategory.getId())
      expect(result.userId).toBe(command.userId)
      expect(result.stock.quantity).toBe(command.quantity.amount)
      expect(result.memo).toBe(command.memo)
      expect(result.price).toBe(command.price)
      expect(result.purchaseDate).toBeDefined()

      // リポジトリが呼ばれたことを確認
      expect(categoryRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ getValue: expect.any(Function) })
      )
      expect(unitRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ getValue: expect.any(Function) })
      )
      expect(ingredientRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          getName: expect.any(Function),
          getCategoryId: expect.any(Function),
        })
      )
    })

    it('カテゴリーが存在しない場合エラーをスローする', async () => {
      // Arrange
      // 無効なカテゴリーIDでコマンドを作成
      const invalidCategoryId = 'cat_' + testDataHelpers.cuid()
      const command = new CreateIngredientCommandBuilder().withCategoryId(invalidCategoryId).build()

      vi.mocked(categoryRepository.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(CategoryNotFoundException)
      await expect(handler.execute(command)).rejects.toThrow('Category not found')
    })

    it('単位が存在しない場合エラーをスローする', async () => {
      // Arrange
      // 無効な単位IDでコマンドを作成
      const invalidUnitId = 'unt_' + testDataHelpers.cuid()
      const command = new CreateIngredientCommandBuilder().withQuantity(3, invalidUnitId).build()

      const mockCategory = new CategoryBuilder().build()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnitNotFoundException)
      await expect(handler.execute(command)).rejects.toThrow('Unit not found')
    })

    it('必須項目のみで食材を作成できる', async () => {
      // Arrange
      // 必須項目のみでコマンドを作成
      const command = new CreateIngredientCommandBuilder().build()

      const mockCategory = new CategoryBuilder().build()
      const mockUnit = new UnitBuilder().build()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit)
      vi.mocked(ingredientRepository.findDuplicates).mockResolvedValue([])
      vi.mocked(ingredientRepository.save).mockImplementation(async (ingredient) => ingredient)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeDefined()
      expect(result.memo).toBeNull()
      expect(result.price).toBeNull()
      expect(result.expiryInfo).toBeNull()
    })
  })
})
