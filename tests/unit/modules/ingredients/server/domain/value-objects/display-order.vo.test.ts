import { describe, it, expect } from 'vitest'

import { InvalidFieldException } from '@/modules/ingredients/server/domain/exceptions'
import { DisplayOrder } from '@/modules/ingredients/server/domain/value-objects'

describe('DisplayOrder', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効な表示順序でインスタンスを生成できる', () => {
      const order = DisplayOrder.create(1)
      expect(order.getValue()).toBe(1)
    })

    it('0を許可する', () => {
      const order = DisplayOrder.create(0)
      expect(order.getValue()).toBe(0)
    })

    it('大きな整数を許可する', () => {
      const order = DisplayOrder.create(9999)
      expect(order.getValue()).toBe(9999)
    })

    // 異常系のテスト
    it('負の数の場合はInvalidFieldExceptionをスローする', () => {
      expect(() => DisplayOrder.create(-1)).toThrow(InvalidFieldException)
      expect(() => DisplayOrder.create(-1)).toThrow('0以上の整数である必要があります')
    })

    it('小数の場合はInvalidFieldExceptionをスローする', () => {
      expect(() => DisplayOrder.create(1.5)).toThrow(InvalidFieldException)
      expect(() => DisplayOrder.create(1.5)).toThrow('整数である必要があります')
    })
  })

  describe('default', () => {
    it('デフォルト値として0を返す', () => {
      const order = DisplayOrder.default()
      expect(order.getValue()).toBe(0)
    })
  })

  describe('isLessThan', () => {
    it('小さい値の場合はtrueを返す', () => {
      const order1 = DisplayOrder.create(1)
      const order2 = DisplayOrder.create(2)
      expect(order1.isLessThan(order2)).toBe(true)
    })

    it('大きい値の場合はfalseを返す', () => {
      const order1 = DisplayOrder.create(2)
      const order2 = DisplayOrder.create(1)
      expect(order1.isLessThan(order2)).toBe(false)
    })

    it('同じ値の場合はfalseを返す', () => {
      const order1 = DisplayOrder.create(1)
      const order2 = DisplayOrder.create(1)
      expect(order1.isLessThan(order2)).toBe(false)
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      const order1 = DisplayOrder.create(1)
      const order2 = DisplayOrder.create(1)
      expect(order1.equals(order2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      const order1 = DisplayOrder.create(1)
      const order2 = DisplayOrder.create(2)
      expect(order1.equals(order2)).toBe(false)
    })
  })
})
