import { describe, it, expect, beforeEach } from 'vitest'
import { OutOfStockSpecification } from '@/modules/ingredients/server/domain/specifications/out-of-stock.specification'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { IngredientBuilder } from '../../../../../../__fixtures__/builders'
import {
  IngredientStock,
  StorageLocation,
  StorageType,
  UnitId,
} from '@/modules/ingredients/server/domain/value-objects'

describe('OutOfStockSpecification', () => {
  let builder: IngredientBuilder
  let spec: OutOfStockSpecification

  beforeEach(() => {
    builder = new IngredientBuilder()
    spec = new OutOfStockSpecification()
  })

  describe('在庫切れ判定', () => {
    it('在庫が0の場合はtrueを返す', () => {
      // 在庫量0の食材は在庫切れと判定
      const stock = new IngredientStock({
        quantity: 0,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const outOfStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(outOfStockItem)).toBe(true)
    })

    it('在庫が0より大きい場合はfalseを返す', () => {
      // 在庫がある食材は在庫切れではない
      const stock = new IngredientStock({
        quantity: 0.1,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const inStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(inStockItem)).toBe(false)
    })

    it.skip('在庫が負の値の場合もtrueを返す', () => {
      // IngredientStockのバリデーションにより負の在庫は作成できない
      // このテストはスキップ
    })

    it('在庫が大きい値の場合はfalseを返す', () => {
      // 十分な在庫がある場合
      const stock = new IngredientStock({
        quantity: 100,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const highStockItem = builder.withIngredientStock(stock).build()

      expect(spec.isSatisfiedBy(highStockItem)).toBe(false)
    })

    it('小数値の在庫でも正確に判定する', () => {
      // 0.0は在庫切れ
      const zeroStock = new IngredientStock({
        quantity: 0.0,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const zeroItem = builder.withIngredientStock(zeroStock).build()

      expect(spec.isSatisfiedBy(zeroItem)).toBe(true)

      // 0.001は在庫あり
      const minimalStock = new IngredientStock({
        quantity: 0.001,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const minimalItem = builder.withIngredientStock(minimalStock).build()

      expect(spec.isSatisfiedBy(minimalItem)).toBe(false)
    })
  })

  describe('LowStockSpecificationとの連携', () => {
    it('OutOfStockはLowStock(0)と同じ結果を返す', async () => {
      // OutOfStockSpecificationとLowStockSpecification(0)は同じ判定をする
      const { LowStockSpecification } = await import(
        '@/modules/ingredients/server/domain/specifications/low-stock.specification'
      )
      const lowStock0 = new LowStockSpecification(0)

      // 在庫0のケース
      const stock0 = new IngredientStock({
        quantity: 0,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const item0 = builder.withIngredientStock(stock0).build()

      expect(spec.isSatisfiedBy(item0)).toBe(lowStock0.isSatisfiedBy(item0))

      // 在庫ありのケース
      const stock1 = new IngredientStock({
        quantity: 1,
        unitId: new UnitId('unit1'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const item1 = builder.withIngredientStock(stock1).build()

      expect(spec.isSatisfiedBy(item1)).toBe(lowStock0.isSatisfiedBy(item1))
    })
  })
})
