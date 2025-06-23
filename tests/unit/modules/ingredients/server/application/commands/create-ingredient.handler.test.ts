import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CreateIngredientCommand } from '@/modules/ingredients/server/application/commands/create-ingredient.command'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { NotFoundException } from '@/modules/ingredients/server/domain/exceptions/not-found.exception'
import { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'

import {
  createTestCategory,
  createTestUnit,
} from '../../../../../../__fixtures__/factories/entities'
import {
  createMockIngredientRepository,
  createMockCategoryRepository,
  createMockUnitRepository,
} from '../../../../../../__fixtures__/mocks/repositories'

describe('CreateIngredientHandler', () => {
  let handler: CreateIngredientHandler
  let ingredientRepository: IngredientRepository
  let categoryRepository: CategoryRepository
  let unitRepository: UnitRepository

  beforeEach(() => {
    // モックリポジトリの作成
    ingredientRepository = createMockIngredientRepository()
    categoryRepository = createMockCategoryRepository()
    unitRepository = createMockUnitRepository()

    handler = new CreateIngredientHandler(ingredientRepository, categoryRepository, unitRepository)
  })

  describe('execute', () => {
    it('食材を正常に作成できる', async () => {
      // Arrange
      const command = new CreateIngredientCommand({
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
          detail: '野菜室',
        },
        bestBeforeDate: '2024-12-31',
        expiryDate: '2025-01-05',
        purchaseDate: '2024-12-20',
        price: 300,
        memo: '新鮮なトマト',
      })

      const mockCategory = createTestCategory()
      const mockUnit = createTestUnit()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit)
      vi.mocked(ingredientRepository.save).mockImplementation(async (ingredient) => ingredient)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getName().getValue()).toBe('トマト')
      expect(result.getCategoryId().getValue()).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.getCurrentStock()).not.toBeNull()
      expect(result.getCurrentStock()?.getQuantity().getValue()).toBe(3)
      expect(result.getMemo()?.getValue()).toBe('新鮮なトマト')

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
      const command = new CreateIngredientCommand({
        name: 'トマト',
        categoryId: 'invalid-category-id',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
        },
        purchaseDate: '2024-12-20',
      })

      vi.mocked(categoryRepository.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow('Category not found')
    })

    it('単位が存在しない場合エラーをスローする', async () => {
      // Arrange
      const command = new CreateIngredientCommand({
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: 'invalid-unit-id',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
        },
        purchaseDate: '2024-12-20',
      })

      const mockCategory = createTestCategory()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow('Unit not found')
    })

    it('必須項目のみで食材を作成できる', async () => {
      // Arrange
      const command = new CreateIngredientCommand({
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
        },
        purchaseDate: '2024-12-20',
      })

      const mockCategory = createTestCategory()
      const mockUnit = createTestUnit()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit)
      vi.mocked(ingredientRepository.save).mockImplementation(async (ingredient) => ingredient)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getMemo()).toBeNull()
      expect(result.getCurrentStock()?.getPrice()).toBeNull()
      expect(result.getCurrentStock()?.getBestBeforeDate()).toBeNull()
      expect(result.getCurrentStock()?.getExpiryDate()).toBeNull()
    })
  })
})
