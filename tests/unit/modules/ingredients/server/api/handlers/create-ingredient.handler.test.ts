import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CreateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/create-ingredient.handler'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'
import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import { ValidationException } from '@/modules/ingredients/server/domain/exceptions/validation.exception'
import { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Quantity,
  UnitId,
  StorageLocation,
  StorageType,
  Price,
  ExpiryInfo,
} from '@/modules/ingredients/server/domain/value-objects'

describe('CreateIngredientApiHandler', () => {
  let apiHandler: CreateIngredientApiHandler
  let commandHandler: CreateIngredientHandler
  let categoryRepository: CategoryRepository
  let unitRepository: UnitRepository

  beforeEach(() => {
    commandHandler = {
      execute: vi.fn(),
    } as unknown as CreateIngredientHandler

    categoryRepository = {
      findById: vi.fn(),
    } as unknown as CategoryRepository

    unitRepository = {
      findById: vi.fn(),
    } as unknown as UnitRepository

    apiHandler = new CreateIngredientApiHandler(commandHandler, categoryRepository, unitRepository)
  })

  describe('handle', () => {
    it('有効なリクエストで食材を作成し、DTOを返す', async () => {
      // Arrange
      const request = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
          detail: '野菜室',
        },
        expiryInfo: {
          bestBeforeDate: '2024-12-31',
          useByDate: '2024-12-27',
        },
        purchaseDate: '2024-12-20',
        price: 300,
        memo: '新鮮なトマト',
      }

      const mockIngredient = new Ingredient({
        id: IngredientId.generate(),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440000'),
        memo: new Memo('新鮮なトマト'),
      })

      const mockStock = new IngredientStock({
        quantity: new Quantity(3),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440001'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        expiryInfo: new ExpiryInfo({
          bestBeforeDate: new Date('2024-12-31'),
          useByDate: new Date('2024-12-27'),
        }),
        purchaseDate: new Date('2024-12-20'),
        price: new Price(300),
      })
      mockIngredient.setStock(mockStock)

      const mockCategory = new Category({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '野菜',
        displayOrder: 1,
      })

      const mockUnit = new Unit({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '個',
        symbol: '個',
        displayOrder: 1,
      })

      vi.mocked(commandHandler.execute).mockResolvedValue(mockIngredient)
      vi.mocked(categoryRepository.findById).mockResolvedValue(mockCategory)
      vi.mocked(unitRepository.findById).mockResolvedValue(mockUnit)

      // Act
      const result = await apiHandler.handle(request)

      // Assert
      expect(result).toHaveProperty('ingredient')
      expect(result.ingredient).toMatchObject({
        id: expect.any(String),
        name: 'トマト',
        category: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: '野菜',
        },
        currentStock: {
          quantity: 3,
          unit: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: '個',
            symbol: '個',
          },
          storageLocation: {
            type: 'REFRIGERATED',
            detail: '野菜室',
          },
          bestBeforeDate: '2024-12-31',
          expiryDate: '2024-12-27',
          purchaseDate: '2024-12-20',
          price: 300,
          isInStock: true,
        },
        memo: '新鮮なトマト',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })

      // コマンドハンドラーが正しいコマンドで呼ばれたことを確認
      expect(commandHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'トマト',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: {
            amount: 3,
            unitId: '550e8400-e29b-41d4-a716-446655440001',
          },
          storageLocation: {
            type: 'REFRIGERATED',
            detail: '野菜室',
          },
          expiryInfo: {
            bestBeforeDate: '2024-12-31',
            useByDate: '2024-12-27',
          },
          purchaseDate: '2024-12-20',
          price: 300,
          memo: '新鮮なトマト',
        })
      )
    })

    it('バリデーションエラーの場合、ValidationExceptionをスローする', async () => {
      // Arrange
      const invalidRequest = {
        name: '', // 空文字は無効
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      await expect(apiHandler.handle(invalidRequest)).rejects.toThrow(ValidationException)
    })

    it('無効なID形式の場合、ValidationExceptionをスローする', async () => {
      // Arrange
      const invalidRequest = {
        name: 'トマト',
        categoryId: 'short', // 無効なID（8文字未満）
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      await expect(apiHandler.handle(invalidRequest)).rejects.toThrow(ValidationException)
    })
  })
})
