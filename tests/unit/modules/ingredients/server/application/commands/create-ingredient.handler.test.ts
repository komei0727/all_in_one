import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { type CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import { type IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { type UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'

import {
  CreateIngredientCommandBuilder,
  CategoryBuilder,
  UnitBuilder,
} from '../../../../../../__fixtures__/builders'
import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'
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

      const mockCategory = new CategoryBuilder().build()
      const mockUnit = new UnitBuilder().build()

      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit)
      vi.mocked(ingredientRepository.save).mockImplementation(async (ingredient) => ingredient)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getName().getValue()).toBe(command.name)
      expect(result.getCategoryId().getValue()).toBe(command.categoryId)
      expect(result.getUserId()).toBe(command.userId)
      expect(result.getIngredientStock().getQuantity()).toBe(command.quantity.amount)
      expect(result.getMemo()?.getValue()).toBe(command.memo)
      expect(result.getPrice()?.getValue()).toBe(command.price)
      expect(result.getPurchaseDate()).toBeInstanceOf(Date)

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
      vi.mocked(ingredientRepository.save).mockImplementation(async (ingredient) => ingredient)

      // Act
      const result = await handler.execute(command)

      // Assert
      expect(result).toBeInstanceOf(Ingredient)
      expect(result.getMemo()).toBeNull()
      expect(result.getPrice()).toBeNull()
      expect(result.getExpiryInfo()).toBeNull()
    })
  })
})
