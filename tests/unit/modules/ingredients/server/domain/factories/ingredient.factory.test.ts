import { faker } from '@faker-js/faker/locale/ja'
import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it, beforeEach, vi } from 'vitest'

import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { BusinessRuleException } from '@/modules/ingredients/server/domain/exceptions'
import { IngredientFactory } from '@/modules/ingredients/server/domain/factories/ingredient.factory'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { createMockIngredientRepository } from '@tests/__fixtures__/mocks/repositories'

describe('IngredientFactory', () => {
  let factory: IngredientFactory
  let mockRepository: IngredientRepository
  let userId: string

  beforeEach(() => {
    userId = faker.string.uuid()

    // リポジトリのモックを作成
    mockRepository = createMockIngredientRepository()

    factory = new IngredientFactory(mockRepository)
  })

  describe('create', () => {
    const validParams = {
      userId: '',
      name: '',
      categoryId: 'cat_' + createId(),
      unitId: 'unt_' + createId(),
      quantity: 100,
      purchaseDate: new Date(),
      storageLocation: { type: StorageType.REFRIGERATED as StorageType },
    }

    beforeEach(() => {
      validParams.userId = userId
      validParams.name = faker.commerce.productName()
    })

    it('重複がない場合、新しい食材を作成できる', async () => {
      // 重複する食材が存在しない
      mockRepository.findDuplicates = vi.fn().mockResolvedValue([])

      // ファクトリで食材を作成
      const ingredient = await factory.create(validParams)

      // 食材が正しく作成されていることを検証
      expect(ingredient).toBeInstanceOf(Ingredient)
      expect(ingredient.getUserId()).toBe(userId)
      expect(ingredient.getName().getValue()).toBe(validParams.name)

      // リポジトリが呼ばれたことを検証
      expect(mockRepository.findDuplicates).toHaveBeenCalledWith({
        userId,
        name: validParams.name,
        expiryInfo: null,
        storageLocation: validParams.storageLocation,
      })
    })

    it('同じ名前・期限・保存場所の食材が既に存在する場合、エラーを投げる', async () => {
      // 重複する食材が存在する（ビルダーを使用してモックデータを作成）
      const existingIngredient = {} as Ingredient
      mockRepository.findDuplicates = vi.fn().mockResolvedValue([existingIngredient])

      // ファクトリで食材作成を試みる
      await expect(factory.create(validParams)).rejects.toThrow(BusinessRuleException)
      await expect(factory.create(validParams)).rejects.toThrow(
        '同じ名前・期限・保存場所の食材が既に存在します'
      )
    })

    it('期限情報を含む食材を作成できる', async () => {
      // 重複する食材が存在しない
      mockRepository.findDuplicates = vi.fn().mockResolvedValue([])

      // 期限情報を含むパラメータ
      const bestBeforeDate = faker.date.future()
      const useByDate = faker.date.past({ refDate: bestBeforeDate }) // 賞味期限より前の日付
      const paramsWithExpiry = {
        ...validParams,
        expiryInfo: {
          bestBeforeDate,
          useByDate,
        },
      }

      // ファクトリで食材を作成
      const ingredient = await factory.create(paramsWithExpiry)

      // 期限情報が設定されていることを検証
      expect(ingredient.getExpiryInfo()).not.toBeNull()
      expect(ingredient.getExpiryInfo()?.getBestBeforeDate()).toEqual(
        paramsWithExpiry.expiryInfo.bestBeforeDate
      )

      // 重複チェックに期限情報が含まれていることを検証
      expect(mockRepository.findDuplicates).toHaveBeenCalledWith({
        userId,
        name: validParams.name,
        expiryInfo: paramsWithExpiry.expiryInfo,
        storageLocation: validParams.storageLocation,
      })
    })

    it('オプショナルなフィールドを含む食材を作成できる', async () => {
      // 重複する食材が存在しない
      mockRepository.findDuplicates = vi.fn().mockResolvedValue([])

      // すべてのフィールドを含むパラメータ
      const fullParams = {
        ...validParams,
        threshold: 50,
        memo: faker.lorem.sentence(),
        price: faker.number.int({ min: 100, max: 1000 }),
        expiryInfo: {
          bestBeforeDate: faker.date.future(),
          useByDate: null,
        },
      }

      // ファクトリで食材を作成
      const ingredient = await factory.create(fullParams)

      // すべてのフィールドが設定されていることを検証
      expect(ingredient.getMemo()?.getValue()).toBe(fullParams.memo)
      expect(ingredient.getPrice()?.getValue()).toBe(fullParams.price)
      expect(ingredient.getIngredientStock().getThreshold()).toBe(fullParams.threshold)
    })
  })

  describe('createWithCheck', () => {
    it('重複チェックを行って食材を作成する', async () => {
      // 重複する食材が存在しない
      mockRepository.findDuplicates = vi.fn().mockResolvedValue([])

      const params = {
        userId,
        name: faker.commerce.productName(),
        categoryId: 'cat_' + createId(),
        unitId: 'unt_' + createId(),
        quantity: 100,
        purchaseDate: new Date(),
        storageLocation: { type: StorageType.REFRIGERATED as StorageType },
      }

      // ファクトリで食材を作成
      const ingredient = await factory.createWithCheck(params)

      // 食材が正しく作成されていることを検証
      expect(ingredient).toBeInstanceOf(Ingredient)
      expect(ingredient.getUserId()).toBe(userId)

      // リポジトリが呼ばれたことを検証
      expect(mockRepository.findDuplicates).toHaveBeenCalled()
    })
  })
})
