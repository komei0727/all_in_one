import { describe, it, expect } from 'vitest'

import { CategoryName } from './category-name.vo'
import { RequiredFieldException, InvalidFieldException } from '../exceptions'

describe('CategoryName', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効なカテゴリー名でインスタンスを生成できる', () => {
      const name = '野菜'
      const categoryName = CategoryName.create(name)
      expect(categoryName.getValue()).toBe(name)
    })

    it('前後の空白をトリミングする', () => {
      const name = '  肉・魚  '
      const categoryName = CategoryName.create(name)
      expect(categoryName.getValue()).toBe('肉・魚')
    })

    it('最大文字数（20文字）のカテゴリー名を許可する', () => {
      const name = 'あ'.repeat(20)
      const categoryName = CategoryName.create(name)
      expect(categoryName.getValue()).toBe(name)
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      expect(() => CategoryName.create('')).toThrow(RequiredFieldException)
      expect(() => CategoryName.create('')).toThrow('カテゴリー名 is required')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      expect(() => CategoryName.create('   ')).toThrow(RequiredFieldException)
    })

    it('20文字を超える場合はInvalidFieldExceptionをスローする', () => {
      const name = 'あ'.repeat(21)
      expect(() => CategoryName.create(name)).toThrow(InvalidFieldException)
      expect(() => CategoryName.create(name)).toThrow('20文字以内で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      const name1 = CategoryName.create('野菜')
      const name2 = CategoryName.create('野菜')
      expect(name1.equals(name2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      const name1 = CategoryName.create('野菜')
      const name2 = CategoryName.create('肉・魚')
      expect(name1.equals(name2)).toBe(false)
    })
  })
})
