import { describe, it, expect, beforeEach } from 'vitest'
import { LowStockSpecification } from '@/modules/ingredients/server/domain/specifications/low-stock.specification'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { IngredientBuilder } from '../../../../../../__fixtures__/builders'
import {
  IngredientStock,
  StorageLocation,
  StorageType,
  UnitId,
} from '@/modules/ingredients/server/domain/value-objects'

describe('LowStockSpecification', () => {
  let builder: IngredientBuilder

  beforeEach(() => {
    builder = new IngredientBuilder()
  })

  describe('コンストラクタ', () => {
    it('正の閾値で作成できる', () => {
      // 正常な閾値で仕様を作成できることを確認
      const spec = new LowStockSpecification(5)
      expect(spec).toBeInstanceOf(LowStockSpecification)
    })

    it('0の閾値で作成できる', () => {
      // 0（在庫切れ）で仕様を作成できることを確認
      const spec = new LowStockSpecification(0)
      expect(spec).toBeInstanceOf(LowStockSpecification)
    })

    it('負の閾値で作成しようとするとエラーになる', () => {
      // 負の閾値は不正な値としてエラーになることを確認
      expect(() => new LowStockSpecification(-1)).toThrow('Threshold must be non-negative')
    })
  })

  describe('在庫不足判定', () => {
    it('在庫が閾値より少ない場合はtrueを返す', () => {
      // 閾値より少ない在庫の食材を正しく判定
      const spec = new LowStockSpecification(5)

      // 在庫量3
      const stock = new IngredientStock({
        quantity: 3,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const lowStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(lowStockItem)).toBe(true)
    })

    it('在庫が閾値と同じ場合はtrueを返す', () => {
      // 境界値のテスト：ちょうど閾値の場合
      const spec = new LowStockSpecification(5)

      // 在庫量5（境界値）
      const stock = new IngredientStock({
        quantity: 5,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const thresholdItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(thresholdItem)).toBe(true)
    })

    it('在庫が閾値より多い場合はfalseを返す', () => {
      // 閾値より多い在庫の食材は対象外
      const spec = new LowStockSpecification(5)

      // 在庫量10
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const sufficientStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(sufficientStockItem)).toBe(false)
    })

    it('在庫が0の場合はtrueを返す', () => {
      // 在庫切れの場合も在庫不足として扱う
      const spec = new LowStockSpecification(5)

      // 在庫量0
      const stock = new IngredientStock({
        quantity: 0,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const outOfStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(outOfStockItem)).toBe(true)
    })

    it('0閾値で在庫0の場合はtrueを返す', () => {
      // 0閾値は「在庫切れ」を意味する
      const spec = new LowStockSpecification(0)

      // 在庫量0
      const stock = new IngredientStock({
        quantity: 0,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const outOfStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(outOfStockItem)).toBe(true)
    })

    it('0閾値で在庫がある場合はfalseを返す', () => {
      // 0閾値で在庫がある場合は対象外
      const spec = new LowStockSpecification(0)

      // 在庫量0.1
      const stock = new IngredientStock({
        quantity: 0.1,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const hasStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(hasStockItem)).toBe(false)
    })
  })

  describe('小数値の判定', () => {
    it('小数値の在庫量でも正確に判定する', () => {
      // 小数値での境界値テスト
      const spec = new LowStockSpecification(2.5)

      // 在庫量2.5（境界値）
      const thresholdStock = new IngredientStock({
        quantity: 2.5,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const thresholdItem = builder.withIngredientStock(thresholdStock).build()

      expect(spec.isSatisfiedBy(thresholdItem)).toBe(true)

      // 在庫量2.6（閾値より多い）
      const aboveStock = new IngredientStock({
        quantity: 2.6,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const aboveItem = builder.withIngredientStock(aboveStock).build()

      expect(spec.isSatisfiedBy(aboveItem)).toBe(false)
    })
  })
})
