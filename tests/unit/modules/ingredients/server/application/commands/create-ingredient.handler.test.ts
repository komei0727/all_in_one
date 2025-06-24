import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { NotFoundException } from '@/modules/ingredients/server/domain/exceptions/not-found.exception'
import { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'

import { CreateIngredientCommandBuilder } from '../../../../../../__fixtures__/builders'
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
      // ビルダーを使用してテストデータを作成
      const command = new CreateIngredientCommandBuilder().withFullData().build()

      const mockCategory = createTestCategory()
      const mockUnit = createTestUnit()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit)
      vi.mocked(ingredientRepository.save).mockImplementation(async (ingredient) => ingredient)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getName().getValue()).toBe(command.name)
      expect(result.getCategoryId().getValue()).toBe(command.categoryId)
      expect(result.getCurrentStock()).not.toBeNull()
      expect(result.getCurrentStock()?.getQuantity().getValue()).toBe(command.quantity.amount)
      expect(result.getMemo()?.getValue()).toBe(command.memo)

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
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('invalid-category-id')
        .build()

      vi.mocked(categoryRepository.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow('Category not found')
    })

    it('単位が存在しない場合エラーをスローする', async () => {
      // Arrange
      // 無効な単位IDでコマンドを作成
      const command = new CreateIngredientCommandBuilder()
        .withQuantity(3, 'invalid-unit-id')
        .build()

      const mockCategory = createTestCategory()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      await expect(handler.execute(command)).rejects.toThrow('Unit not found')
    })

    it('必須項目のみで食材を作成できる', async () => {
      // Arrange
      // 必須項目のみでコマンドを作成
      const command = new CreateIngredientCommandBuilder().build()

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
      expect(result.getCurrentStock()?.getExpiryInfo().getBestBeforeDate()).toBeNull()
      expect(result.getCurrentStock()?.getExpiryInfo().getUseByDate()).toBeNull()
    })
  })
})
