import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { UpdateIngredientCommand } from '@/modules/ingredients/server/application/commands/update-ingredient.command'
import { UpdateIngredientHandler } from '@/modules/ingredients/server/application/commands/update-ingredient.handler'
import {
  DuplicateIngredientException,
  IngredientNotFoundException,
  BusinessRuleException,
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '@/modules/ingredients/server/domain/repositories/repository-factory.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'
import { aCategory, aUnit, anIngredient, testDataHelpers } from '@tests/__fixtures__/builders'

describe('UpdateIngredientHandler', () => {
  let handler: UpdateIngredientHandler
  let ingredientRepository: IngredientRepository
  let categoryRepository: CategoryRepository
  let unitRepository: UnitRepository
  let repositoryFactory: RepositoryFactory
  let transactionManager: TransactionManager

  beforeEach(() => {
    // モックの作成
    ingredientRepository = {
      findById: vi.fn(),
      findDuplicates: vi.fn(),
      update: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    } as unknown as IngredientRepository

    categoryRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
    } as unknown as CategoryRepository

    unitRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
    } as unknown as UnitRepository

    repositoryFactory = {
      createIngredientRepository: vi.fn().mockReturnValue(ingredientRepository),
      createCategoryRepository: vi.fn().mockReturnValue(categoryRepository),
      createUnitRepository: vi.fn().mockReturnValue(unitRepository),
    } as unknown as RepositoryFactory

    transactionManager = {
      run: vi.fn().mockImplementation(async (fn) => fn({})),
    } as unknown as TransactionManager

    handler = new UpdateIngredientHandler(
      ingredientRepository,
      categoryRepository,
      unitRepository,
      repositoryFactory,
      transactionManager
    )
  })

  describe('正常系', () => {
    it('食材名を更新できる（重複なし）', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const ingredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('トマト')
        .build()
      const category = aCategory().build()
      const unit = aUnit().build()
      const updatedIngredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('新しいトマト')
        .build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        name: '新しいトマト',
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(ingredientRepository.findDuplicates).mockResolvedValue([])
      vi.mocked(ingredientRepository.update).mockResolvedValue(updatedIngredient)
      vi.mocked(categoryRepository.findById).mockResolvedValue(category)
      vi.mocked(unitRepository.findById).mockResolvedValue(unit)

      // 実行
      const result = await handler.execute(command)

      // 検証
      expect(result.name).toBe('新しいトマト')
      expect(ingredientRepository.findDuplicates).toHaveBeenCalledWith({
        userId: userId,
        name: '新しいトマト',
        expiryInfo: null,
        storageLocation: expect.any(Object),
      })
    })

    it('食材の複数のフィールドを更新できる', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const ingredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('トマト')
        .withMemo('古いメモ')
        .withPrice(100)
        .build()
      const category = aCategory().build()
      const unit = aUnit().build()
      const updatedIngredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('トマト')
        .withMemo('新しいメモ')
        .withPrice(200)
        .build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        memo: '新しいメモ',
        price: 200,
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(ingredientRepository.update).mockResolvedValue(updatedIngredient)
      vi.mocked(categoryRepository.findById).mockResolvedValue(category)
      vi.mocked(unitRepository.findById).mockResolvedValue(unit)

      // 実行
      const result = await handler.execute(command)

      // 検証
      expect(result.memo).toBe('新しいメモ')
      expect(result.price).toBe(200)
      // 名前を変更していないので重複チェックは呼ばれない
      expect(ingredientRepository.findDuplicates).not.toHaveBeenCalled()
    })
  })

  describe('異常系', () => {
    it('食材が見つからない場合、IngredientNotFoundExceptionをスローする', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        name: '新しいトマト',
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(null)

      // 実行と検証
      await expect(handler.execute(command)).rejects.toThrow(IngredientNotFoundException)
    })

    it('削除済みの食材を更新しようとした場合、BusinessRuleExceptionをスローする', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const ingredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withDeletedAt(new Date())
        .build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        name: '新しいトマト',
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)

      // 実行と検証
      await expect(handler.execute(command)).rejects.toThrow(BusinessRuleException)
      await expect(handler.execute(command)).rejects.toThrow('削除済みの食材は更新できません')
    })

    it('重複する食材名に更新しようとした場合、DuplicateIngredientExceptionをスローする', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const duplicateIngredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const ingredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('トマト')
        .build()
      const duplicateIngredient = anIngredient()
        .withId(duplicateIngredientId)
        .withUserId(userId)
        .withName('新しいトマト')
        .build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        name: '新しいトマト',
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(ingredientRepository.findDuplicates).mockResolvedValue([duplicateIngredient])

      // 実行と検証
      await expect(handler.execute(command)).rejects.toThrow(DuplicateIngredientException)
    })

    it('カテゴリが見つからない場合、CategoryNotFoundExceptionをスローする', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const categoryId = testDataHelpers.categoryId()
      const ingredient = anIngredient().withId(ingredientId).withUserId(userId).build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        categoryId: categoryId,
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(categoryRepository.findById).mockResolvedValue(null)

      // 実行と検証
      await expect(handler.execute(command)).rejects.toThrow(CategoryNotFoundException)
    })

    it('単位が見つからない場合、UnitNotFoundExceptionをスローする', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const unitId = testDataHelpers.unitId()
      const ingredient = anIngredient().withId(ingredientId).withUserId(userId).build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        stock: {
          quantity: 100,
          unitId: unitId,
          storageLocation: {
            type: 'REFRIGERATED',
            detail: '野菜室',
          },
          threshold: 50,
        },
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(ingredientRepository.findDuplicates).mockResolvedValue([])
      vi.mocked(unitRepository.findById).mockResolvedValue(null)

      // 実行と検証
      await expect(handler.execute(command)).rejects.toThrow(UnitNotFoundException)
    })
  })

  describe('重複チェックのシナリオ', () => {
    it('自分自身は重複として扱わない', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const ingredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('トマト')
        .build()
      const category = aCategory().build()
      const unit = aUnit().build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        name: 'トマト', // 同じ名前に更新（実質変更なし）
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(ingredientRepository.findDuplicates).mockResolvedValue([ingredient]) // 自分自身が返される
      vi.mocked(ingredientRepository.update).mockResolvedValue(ingredient)
      vi.mocked(categoryRepository.findById).mockResolvedValue(category)
      vi.mocked(unitRepository.findById).mockResolvedValue(unit)

      // 実行（エラーにならないことを確認）
      const result = await handler.execute(command)

      // 検証
      expect(result.name).toBe('トマト')
    })

    it('期限情報と保存場所を含めた重複チェックが行われる', async () => {
      // テストデータの準備
      const ingredientId = testDataHelpers.ingredientId()
      const duplicateIngredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const bestBeforeDate = new Date('2024-12-31')
      const ingredient = anIngredient()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('トマト')
        .withExpiryInfo({
          bestBeforeDate,
          useByDate: null,
        })
        .build()
      const duplicateIngredient = anIngredient()
        .withId(duplicateIngredientId)
        .withUserId(userId)
        .withName('新しいトマト')
        .withExpiryInfo({
          bestBeforeDate: new Date('2024-12-25'),
          useByDate: null,
        })
        .build()

      const command: UpdateIngredientCommand = {
        id: ingredientId,
        userId: userId,
        name: '新しいトマト',
        expiryInfo: {
          bestBeforeDate: new Date('2024-12-25'),
          useByDate: null,
        },
      }

      // モックの設定
      vi.mocked(ingredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(ingredientRepository.findDuplicates).mockResolvedValue([duplicateIngredient])

      // 実行と検証
      await expect(handler.execute(command)).rejects.toThrow(DuplicateIngredientException)
    })
  })
})
