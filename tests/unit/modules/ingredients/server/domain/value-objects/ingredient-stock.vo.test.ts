import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect } from 'vitest'

import {
  IngredientStock,
  StorageLocation,
  StorageType,
  UnitId,
} from '@/modules/ingredients/server/domain/value-objects'

import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('IngredientStock値オブジェクト', () => {
  describe('正常系', () => {
    it('必須項目のみで作成できる', () => {
      // Given: 必須項目のみ
      const quantity = faker.number.float({ min: 0, max: 100, fractionDigits: 2 })
      const unitId = new UnitId(testDataHelpers.unitId())
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED)

      // When: IngredientStockを作成
      const stock = new IngredientStock({
        quantity,
        unitId,
        storageLocation,
      })

      // Then: 正しく作成される
      expect(stock.getQuantity()).toBe(quantity)
      expect(stock.getUnitId()).toBe(unitId)
      expect(stock.getStorageLocation()).toBe(storageLocation)
      expect(stock.getThreshold()).toBeNull()
    })

    it('閾値付きで作成できる', () => {
      // Given: 閾値付き
      const quantity = faker.number.float({ min: 10, max: 100, fractionDigits: 2 })
      const unitId = new UnitId(testDataHelpers.unitId())
      const storageLocation = new StorageLocation(StorageType.FROZEN)
      const threshold = faker.number.float({ min: 0, max: 10, fractionDigits: 2 })

      // When: IngredientStockを作成
      const stock = new IngredientStock({
        quantity,
        unitId,
        storageLocation,
        threshold,
      })

      // Then: 正しく作成される
      expect(stock.getQuantity()).toBe(quantity)
      expect(stock.getThreshold()).toBe(threshold)
    })

    it('isOutOfStock()が正しく動作する', () => {
      // Given: 在庫0の状態
      const stockEmpty = new IngredientStock({
        quantity: 0,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const stockAvailable = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      // When/Then: 在庫切れ判定
      expect(stockEmpty.isOutOfStock()).toBe(true)
      expect(stockAvailable.isOutOfStock()).toBe(false)
    })

    it('isLowStock()が正しく動作する', () => {
      // Given: 閾値設定あり
      const stockLow = new IngredientStock({
        quantity: 3,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        threshold: 5,
      })

      const stockNormal = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        threshold: 5,
      })

      const stockNoThreshold = new IngredientStock({
        quantity: 1,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      // When/Then: 在庫不足判定
      expect(stockLow.isLowStock()).toBe(true)
      expect(stockNormal.isLowStock()).toBe(false)
      expect(stockNoThreshold.isLowStock()).toBe(false) // 閾値なしの場合は常にfalse
    })

    it('add()で在庫を追加できる', () => {
      // Given: 初期在庫
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      // When: 在庫追加
      const newStock = stock.add(5)

      // Then: 新しいインスタンスで在庫が増える
      expect(newStock.getQuantity()).toBe(15)
      expect(stock.getQuantity()).toBe(10) // 元のインスタンスは変わらない
    })

    it('subtract()で在庫を減らせる', () => {
      // Given: 初期在庫
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      // When: 在庫減少
      const newStock = stock.subtract(3)

      // Then: 新しいインスタンスで在庫が減る
      expect(newStock.getQuantity()).toBe(7)
      expect(stock.getQuantity()).toBe(10) // 元のインスタンスは変わらない
    })

    it('subtract()で在庫が0未満にはならない', () => {
      // Given: 少ない在庫
      const stock = new IngredientStock({
        quantity: 3,
        unitId: new UnitId(testDataHelpers.unitId()),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      // When: 在庫以上を減らそうとする
      const newStock = stock.subtract(5)

      // Then: 0で止まる
      expect(newStock.getQuantity()).toBe(0)
    })

    it('equals()で同じ値のオブジェクトを比較できる', () => {
      // Given: 同じ値を持つ2つのIngredientStock
      const unitId = testDataHelpers.unitId()
      const stock1 = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(unitId),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        threshold: 5,
      })

      const stock2 = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(unitId),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        threshold: 5,
      })

      // When/Then: 等価比較
      expect(stock1.equals(stock2)).toBe(true)
    })

    it('toObject()でプレーンオブジェクトに変換できる', () => {
      // Given: IngredientStock
      const unitId = testDataHelpers.unitId()
      const stock = new IngredientStock({
        quantity: 10.5,
        unitId: new UnitId(unitId),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        threshold: 5,
      })

      // When: プレーンオブジェクトに変換
      const obj = stock.toObject()

      // Then: 正しい形式のオブジェクトになる
      expect(obj).toEqual({
        quantity: 10.5,
        unitId: unitId,
        storageLocation: {
          type: 'REFRIGERATED',
          detail: '野菜室',
        },
        threshold: 5,
      })
    })
  })

  describe('異常系', () => {
    it('負の数量の場合はエラーになる', () => {
      // Given: 負の数量
      const quantity = -1
      const unitId = new UnitId(testDataHelpers.unitId())
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED)

      // When/Then: エラーが発生する
      expect(
        () =>
          new IngredientStock({
            quantity,
            unitId,
            storageLocation,
          })
      ).toThrow('在庫数量は0以上の値を指定してください')
    })

    it('負の閾値の場合はエラーになる', () => {
      // Given: 負の閾値
      const quantity = 10
      const unitId = new UnitId(testDataHelpers.unitId())
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED)
      const threshold = -1

      // When/Then: エラーが発生する
      expect(
        () =>
          new IngredientStock({
            quantity,
            unitId,
            storageLocation,
            threshold,
          })
      ).toThrow('在庫閾値は0以上の値を指定してください')
    })
  })

  describe('fromObject', () => {
    it('プレーンオブジェクトからIngredientStockを作成できる', () => {
      // Given: プレーンオブジェクト
      const unitId = testDataHelpers.unitId()
      const obj = {
        quantity: 10.5,
        unitId: unitId,
        storageLocation: {
          type: StorageType.REFRIGERATED,
          detail: '野菜室',
        },
        threshold: 5,
      }

      // When: IngredientStockを作成
      const stock = IngredientStock.fromObject(obj)

      // Then: 正しく作成される
      expect(stock.getQuantity()).toBe(10.5)
      expect(stock.getUnitId().getValue()).toBe(unitId)
      expect(stock.getStorageLocation().getType()).toBe(StorageType.REFRIGERATED)
      expect(stock.getStorageLocation().getDetail()).toBe('野菜室')
      expect(stock.getThreshold()).toBe(5)
    })

    it('thresholdがない場合も作成できる', () => {
      // Given: thresholdなしのプレーンオブジェクト
      const obj = {
        quantity: 10,
        unitId: testDataHelpers.unitId(),
        storageLocation: {
          type: StorageType.FROZEN,
        },
      }

      // When: IngredientStockを作成
      const stock = IngredientStock.fromObject(obj)

      // Then: 正しく作成される
      expect(stock.getQuantity()).toBe(10)
      expect(stock.getThreshold()).toBeNull()
    })
  })
})
