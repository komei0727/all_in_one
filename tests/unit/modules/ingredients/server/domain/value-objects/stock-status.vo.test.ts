import { describe, it, expect } from 'vitest'

import { StockStatus } from '@/modules/ingredients/server/domain/value-objects/stock-status.vo'

describe('StockStatus', () => {
  describe('定数', () => {
    it('IN_STOCKステータスが定義されている', () => {
      // Then: IN_STOCKステータスが存在
      expect(StockStatus.IN_STOCK).toBeInstanceOf(StockStatus)
      expect(StockStatus.IN_STOCK.getValue()).toBe('IN_STOCK')
    })

    it('LOW_STOCKステータスが定義されている', () => {
      // Then: LOW_STOCKステータスが存在
      expect(StockStatus.LOW_STOCK).toBeInstanceOf(StockStatus)
      expect(StockStatus.LOW_STOCK.getValue()).toBe('LOW_STOCK')
    })

    it('OUT_OF_STOCKステータスが定義されている', () => {
      // Then: OUT_OF_STOCKステータスが存在
      expect(StockStatus.OUT_OF_STOCK).toBeInstanceOf(StockStatus)
      expect(StockStatus.OUT_OF_STOCK.getValue()).toBe('OUT_OF_STOCK')
    })
  })

  describe('from', () => {
    it('有効なステータス文字列から作成できる', () => {
      // When: 文字列からステータスを作成
      const inStock = StockStatus.from('IN_STOCK')
      const lowStock = StockStatus.from('LOW_STOCK')
      const outOfStock = StockStatus.from('OUT_OF_STOCK')

      // Then: 正しいステータスが作成される
      expect(inStock.equals(StockStatus.IN_STOCK)).toBe(true)
      expect(lowStock.equals(StockStatus.LOW_STOCK)).toBe(true)
      expect(outOfStock.equals(StockStatus.OUT_OF_STOCK)).toBe(true)
    })

    it('無効なステータス文字列は拒否される', () => {
      // When/Then: 無効なステータスでエラー
      expect(() => StockStatus.from('INVALID')).toThrow('無効な在庫ステータス: INVALID')
    })

    it('空文字列は拒否される', () => {
      // When/Then: 空文字列でエラー
      expect(() => StockStatus.from('')).toThrow('無効な在庫ステータス: ')
    })

    it('nullやundefinedは拒否される', () => {
      // When/Then: nullやundefinedでエラー
      expect(() => StockStatus.from(null as any)).toThrow()
      expect(() => StockStatus.from(undefined as any)).toThrow()
    })
  })

  describe('状態判定メソッド', () => {
    describe('isInStock', () => {
      it('IN_STOCKステータスの場合はtrueを返す', () => {
        // Then: IN_STOCKの場合true
        expect(StockStatus.IN_STOCK.isInStock()).toBe(true)
        expect(StockStatus.LOW_STOCK.isInStock()).toBe(false)
        expect(StockStatus.OUT_OF_STOCK.isInStock()).toBe(false)
      })
    })

    describe('isLowStock', () => {
      it('LOW_STOCKステータスの場合はtrueを返す', () => {
        // Then: LOW_STOCKの場合true
        expect(StockStatus.IN_STOCK.isLowStock()).toBe(false)
        expect(StockStatus.LOW_STOCK.isLowStock()).toBe(true)
        expect(StockStatus.OUT_OF_STOCK.isLowStock()).toBe(false)
      })
    })

    describe('isOutOfStock', () => {
      it('OUT_OF_STOCKステータスの場合はtrueを返す', () => {
        // Then: OUT_OF_STOCKの場合true
        expect(StockStatus.IN_STOCK.isOutOfStock()).toBe(false)
        expect(StockStatus.LOW_STOCK.isOutOfStock()).toBe(false)
        expect(StockStatus.OUT_OF_STOCK.isOutOfStock()).toBe(true)
      })
    })

    describe('needsReplenishment', () => {
      it('LOW_STOCKまたはOUT_OF_STOCKの場合はtrueを返す', () => {
        // Then: 補充が必要な状態の判定
        expect(StockStatus.IN_STOCK.needsReplenishment()).toBe(false)
        expect(StockStatus.LOW_STOCK.needsReplenishment()).toBe(true)
        expect(StockStatus.OUT_OF_STOCK.needsReplenishment()).toBe(true)
      })
    })
  })

  describe('優先度', () => {
    describe('getPriority', () => {
      it('各ステータスの優先度を返す', () => {
        // Then: OUT_OF_STOCK > LOW_STOCK > IN_STOCK
        expect(StockStatus.OUT_OF_STOCK.getPriority()).toBe(3)
        expect(StockStatus.LOW_STOCK.getPriority()).toBe(2)
        expect(StockStatus.IN_STOCK.getPriority()).toBe(1)
      })
    })

    describe('hasHigherPriorityThan', () => {
      it('優先度を比較できる', () => {
        // Then: 優先度の比較
        expect(StockStatus.OUT_OF_STOCK.hasHigherPriorityThan(StockStatus.LOW_STOCK)).toBe(true)
        expect(StockStatus.OUT_OF_STOCK.hasHigherPriorityThan(StockStatus.IN_STOCK)).toBe(true)
        expect(StockStatus.LOW_STOCK.hasHigherPriorityThan(StockStatus.IN_STOCK)).toBe(true)
        expect(StockStatus.IN_STOCK.hasHigherPriorityThan(StockStatus.OUT_OF_STOCK)).toBe(false)
      })
    })
  })

  describe('equals', () => {
    it('同じステータスの場合はtrueを返す', () => {
      // Given: 同じステータス
      const status1 = StockStatus.from('IN_STOCK')
      const status2 = StockStatus.from('IN_STOCK')

      // Then: 等価と判定
      expect(status1.equals(status2)).toBe(true)
      expect(StockStatus.IN_STOCK.equals(status1)).toBe(true)
    })

    it('異なるステータスの場合はfalseを返す', () => {
      // Then: 非等価と判定
      expect(StockStatus.IN_STOCK.equals(StockStatus.LOW_STOCK)).toBe(false)
      expect(StockStatus.LOW_STOCK.equals(StockStatus.OUT_OF_STOCK)).toBe(false)
    })
  })

  describe('toString', () => {
    it('ステータス文字列を返す', () => {
      // Then: getValue()と同じ値を返す
      expect(StockStatus.IN_STOCK.toString()).toBe('IN_STOCK')
      expect(StockStatus.LOW_STOCK.toString()).toBe('LOW_STOCK')
      expect(StockStatus.OUT_OF_STOCK.toString()).toBe('OUT_OF_STOCK')
    })
  })
})
