import { describe, it, expect } from 'vitest'

import { type Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { StockCalculationService } from '@/modules/ingredients/server/domain/services/stock-calculation.service'
import {
  CategoryId,
  UnitId,
  IngredientStock,
  StorageLocation,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'

import { IngredientBuilder } from '../../../../../../__fixtures__/builders'
import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('StockCalculationService', () => {
  const stockCalculationService = new StockCalculationService()

  describe('hasEnoughStock', () => {
    it('必要な在庫がある場合はtrueを返す', () => {
      // Given: 十分な在庫がある食材
      const ingredient = new IngredientBuilder()
        .withIngredientStock(
          new IngredientStock({
            quantity: 10,
            unitId: new UnitId(testDataHelpers.unitId()),
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()

      // When: 5個必要な場合
      const hasEnough = stockCalculationService.hasEnoughStock(ingredient, 5)

      // Then: trueが返される
      expect(hasEnough).toBe(true)
    })

    it('必要な在庫がない場合はfalseを返す', () => {
      // Given: 在庫が少ない食材
      const ingredient = new IngredientBuilder()
        .withIngredientStock(
          new IngredientStock({
            quantity: 3,
            unitId: new UnitId(testDataHelpers.unitId()),
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()

      // When: 5個必要な場合
      const hasEnough = stockCalculationService.hasEnoughStock(ingredient, 5)

      // Then: falseが返される
      expect(hasEnough).toBe(false)
    })

    it('ちょうど必要な在庫がある場合はtrueを返す', () => {
      // Given: ちょうどの在庫がある食材
      const ingredient = new IngredientBuilder()
        .withIngredientStock(
          new IngredientStock({
            quantity: 5,
            unitId: new UnitId(testDataHelpers.unitId()),
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()

      // When: 5個必要な場合
      const hasEnough = stockCalculationService.hasEnoughStock(ingredient, 5)

      // Then: trueが返される
      expect(hasEnough).toBe(true)
    })
  })

  describe('checkMultipleStocks', () => {
    it('すべての食材が必要量を満たす場合はすべてtrueを返す', () => {
      // Given: 複数の食材と必要量
      const ingredients = [
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 10,
              unitId: new UnitId(testDataHelpers.unitId()),
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 20,
              unitId: new UnitId(testDataHelpers.unitId()),
              storageLocation: new StorageLocation(StorageType.FROZEN),
            })
          )
          .build(),
      ]

      const requirements = [
        { ingredientId: ingredients[0].getId().getValue(), quantity: 5 },
        { ingredientId: ingredients[1].getId().getValue(), quantity: 15 },
      ]

      // When: 在庫チェック
      const results = stockCalculationService.checkMultipleStocks(ingredients, requirements)

      // Then: すべてtrueが返される
      expect(results).toEqual({
        [ingredients[0].getId().getValue()]: true,
        [ingredients[1].getId().getValue()]: true,
      })
    })

    it('一部の食材が不足している場合は該当箇所がfalseを返す', () => {
      // Given: 一部不足する食材
      const ingredients = [
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 10,
              unitId: new UnitId(testDataHelpers.unitId()),
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 5,
              unitId: new UnitId(testDataHelpers.unitId()),
              storageLocation: new StorageLocation(StorageType.FROZEN),
            })
          )
          .build(),
      ]

      const requirements = [
        { ingredientId: ingredients[0].getId().getValue(), quantity: 5 },
        { ingredientId: ingredients[1].getId().getValue(), quantity: 10 }, // 不足
      ]

      // When: 在庫チェック
      const results = stockCalculationService.checkMultipleStocks(ingredients, requirements)

      // Then: 不足している食材がfalseになる
      expect(results).toEqual({
        [ingredients[0].getId().getValue()]: true,
        [ingredients[1].getId().getValue()]: false,
      })
    })

    it('存在しない食材IDの場合はfalseを返す', () => {
      // Given: 食材リスト
      const ingredients = [
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 10,
              unitId: new UnitId(testDataHelpers.unitId()),
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
      ]

      const requirements = [
        { ingredientId: ingredients[0].getId().getValue(), quantity: 5 },
        { ingredientId: 'ing_' + testDataHelpers.cuid(), quantity: 1 }, // 存在しないID
      ]

      // When: 在庫チェック
      const results = stockCalculationService.checkMultipleStocks(ingredients, requirements)

      // Then: 存在しない食材はfalse
      expect(results[ingredients[0].getId().getValue()]).toBe(true)
      expect(Object.values(results).filter((v) => v === false)).toHaveLength(1)
    })
  })

  describe('getInsufficientIngredients', () => {
    it('不足している食材のリストを返す', () => {
      // Given: 在庫が混在する食材
      const sufficientIngredient = new IngredientBuilder()
        .withName('トマト')
        .withIngredientStock(
          new IngredientStock({
            quantity: 10,
            unitId: new UnitId(testDataHelpers.unitId()),
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()

      const insufficientIngredient = new IngredientBuilder()
        .withName('キャベツ')
        .withIngredientStock(
          new IngredientStock({
            quantity: 2,
            unitId: new UnitId(testDataHelpers.unitId()),
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()

      const ingredients = [sufficientIngredient, insufficientIngredient]

      const requirements = [
        { ingredientId: sufficientIngredient.getId().getValue(), quantity: 5 },
        { ingredientId: insufficientIngredient.getId().getValue(), quantity: 5 },
      ]

      // When: 不足食材を取得
      const insufficient = stockCalculationService.getInsufficientIngredients(
        ingredients,
        requirements
      )

      // Then: 不足している食材のみが返される
      expect(insufficient).toHaveLength(1)
      expect(insufficient[0]).toBe(insufficientIngredient)
    })

    it('すべて充足している場合は空配列を返す', () => {
      // Given: すべて充足する食材
      const ingredients = [
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 10,
              unitId: new UnitId(testDataHelpers.unitId()),
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
      ]

      const requirements = [{ ingredientId: ingredients[0].getId().getValue(), quantity: 5 }]

      // When: 不足食材を取得
      const insufficient = stockCalculationService.getInsufficientIngredients(
        ingredients,
        requirements
      )

      // Then: 空配列が返される
      expect(insufficient).toHaveLength(0)
    })
  })

  describe('aggregateByCategory', () => {
    it('カテゴリー別に在庫を集計する', () => {
      // Given: 異なるカテゴリーの食材
      const categoryId1 = new CategoryId(testDataHelpers.categoryId())
      const categoryId2 = new CategoryId(testDataHelpers.categoryId())
      const unitId = new UnitId(testDataHelpers.unitId())

      const ingredients = [
        new IngredientBuilder()
          .withCategoryId(categoryId1)
          .withIngredientStock(
            new IngredientStock({
              quantity: 10,
              unitId,
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
        new IngredientBuilder()
          .withCategoryId(categoryId1)
          .withIngredientStock(
            new IngredientStock({
              quantity: 5,
              unitId,
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
        new IngredientBuilder()
          .withCategoryId(categoryId2)
          .withIngredientStock(
            new IngredientStock({
              quantity: 20,
              unitId,
              storageLocation: new StorageLocation(StorageType.FROZEN),
            })
          )
          .build(),
      ]

      // When: カテゴリー別集計
      const aggregated = stockCalculationService.aggregateByCategory(ingredients)

      // Then: カテゴリー別に集計される
      expect(aggregated).toEqual({
        [categoryId1.getValue()]: {
          totalQuantity: 15,
          ingredientCount: 2,
        },
        [categoryId2.getValue()]: {
          totalQuantity: 20,
          ingredientCount: 1,
        },
      })
    })

    it('削除済みの食材は集計から除外される', () => {
      // Given: 削除済みを含む食材
      const categoryId = new CategoryId(testDataHelpers.categoryId())
      const unitId = new UnitId(testDataHelpers.unitId())
      const userId = testDataHelpers.userId()

      const activeIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withCategoryId(categoryId)
        .withIngredientStock(
          new IngredientStock({
            quantity: 10,
            unitId,
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()

      const deletedIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withCategoryId(categoryId)
        .withIngredientStock(
          new IngredientStock({
            quantity: 5,
            unitId,
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()
      deletedIngredient.delete(userId)

      const ingredients = [activeIngredient, deletedIngredient]

      // When: カテゴリー別集計
      const aggregated = stockCalculationService.aggregateByCategory(ingredients)

      // Then: 削除済みは含まれない
      expect(aggregated).toEqual({
        [categoryId.getValue()]: {
          totalQuantity: 10,
          ingredientCount: 1,
        },
      })
    })

    it('空の食材リストの場合は空オブジェクトを返す', () => {
      // Given: 空のリスト
      const ingredients: Ingredient[] = []

      // When: カテゴリー別集計
      const aggregated = stockCalculationService.aggregateByCategory(ingredients)

      // Then: 空オブジェクトが返される
      expect(aggregated).toEqual({})
    })
  })

  describe('calculateTotalStock', () => {
    it('同じ単位の食材の合計在庫を計算する', () => {
      // Given: 同じ単位の食材
      const unitId = new UnitId(testDataHelpers.unitId())
      const ingredients = [
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 10,
              unitId,
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 5,
              unitId,
              storageLocation: new StorageLocation(StorageType.FROZEN),
            })
          )
          .build(),
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 3,
              unitId,
              storageLocation: new StorageLocation(StorageType.ROOM_TEMPERATURE),
            })
          )
          .build(),
      ]

      // When: 合計在庫を計算
      const total = stockCalculationService.calculateTotalStock(ingredients, unitId.getValue())

      // Then: 合計値が返される
      expect(total).toBe(18)
    })

    it('異なる単位の食材は除外される', () => {
      // Given: 異なる単位が混在
      const ingredients = [
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 10,
              unitId: new UnitId(testDataHelpers.unitId()),
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
        new IngredientBuilder()
          .withIngredientStock(
            new IngredientStock({
              quantity: 5,
              unitId: new UnitId(testDataHelpers.unitId()), // 異なる単位
              storageLocation: new StorageLocation(StorageType.REFRIGERATED),
            })
          )
          .build(),
      ]

      // When: 指定単位の合計在庫を計算
      const targetUnitId = ingredients[0].getIngredientStock().getUnitId().getValue()
      const total = stockCalculationService.calculateTotalStock(ingredients, targetUnitId)

      // Then: 指定単位のみの合計
      expect(total).toBe(10)
    })

    it('削除済みの食材は除外される', () => {
      // Given: 削除済みを含む食材
      const unitId = new UnitId(testDataHelpers.unitId())
      const userId = testDataHelpers.userId()

      const activeIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withIngredientStock(
          new IngredientStock({
            quantity: 10,
            unitId,
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()

      const deletedIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withIngredientStock(
          new IngredientStock({
            quantity: 5,
            unitId,
            storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          })
        )
        .build()
      deletedIngredient.delete(userId)

      const ingredients = [activeIngredient, deletedIngredient]

      // When: 合計在庫を計算
      const total = stockCalculationService.calculateTotalStock(ingredients, unitId.getValue())

      // Then: 削除済みは含まれない
      expect(total).toBe(10)
    })
  })
})
