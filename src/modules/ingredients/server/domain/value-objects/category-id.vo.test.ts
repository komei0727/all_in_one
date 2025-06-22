import { describe, it, expect } from 'vitest'

import { CategoryId } from './category-id.vo'
import { RequiredFieldException } from '../exceptions'

describe('CategoryId', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効なIDでインスタンスを生成できる', () => {
      const id = 'cat_123'
      const categoryId = CategoryId.create(id)
      expect(categoryId.getValue()).toBe(id)
    })

    it('UUID形式のIDを許可する', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      const categoryId = CategoryId.create(id)
      expect(categoryId.getValue()).toBe(id)
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      expect(() => CategoryId.create('')).toThrow(RequiredFieldException)
      expect(() => CategoryId.create('')).toThrow('カテゴリーID is required')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      expect(() => CategoryId.create('   ')).toThrow(RequiredFieldException)
    })

    it('undefinedの場合はRequiredFieldExceptionをスローする', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => CategoryId.create(undefined as any)).toThrow(RequiredFieldException)
    })

    it('nullの場合はRequiredFieldExceptionをスローする', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => CategoryId.create(null as any)).toThrow(RequiredFieldException)
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      const id1 = CategoryId.create('cat_123')
      const id2 = CategoryId.create('cat_123')
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      const id1 = CategoryId.create('cat_123')
      const id2 = CategoryId.create('cat_456')
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
