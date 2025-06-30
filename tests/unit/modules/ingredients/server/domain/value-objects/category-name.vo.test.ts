import { describe, it, expect } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CategoryName } from '@/modules/ingredients/server/domain/value-objects'
import { CategoryNameBuilder } from '@tests/__fixtures__/builders'

describe('CategoryName', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効なカテゴリー名でインスタンスを生成できる', () => {
      // テストデータビルダーを使用してランダムなカテゴリー名で検証
      const builder = new CategoryNameBuilder()
      const name = builder.getProps().value!
      const categoryName = CategoryName.create(name)
      expect(categoryName.getValue()).toBe(name)
    })

    it('前後の空白をトリミングする', () => {
      const name = '  肉・魚  '
      const categoryName = CategoryName.create(name)
      expect(categoryName.getValue()).toBe('肉・魚')
    })

    it('最大長（20文字）のカテゴリー名を許可する', () => {
      // 最大長のカテゴリー名を設定
      const builder = new CategoryNameBuilder().withMaxLengthValue()
      const name = builder.getProps().value!
      const categoryName = CategoryName.create(name)
      expect(categoryName.getValue()).toHaveLength(20)
    })

    // 異常系のテスト
    it('空文字の場合、RequiredFieldExceptionをスローする', () => {
      // 空文字を設定してエラーを検証
      const builder = new CategoryNameBuilder().withEmptyValue()
      expect(() => CategoryName.create(builder.getProps().value!)).toThrow(RequiredFieldException)
      expect(() => CategoryName.create(builder.getProps().value!)).toThrow('カテゴリー名は必須です')
    })

    it('nullの場合、RequiredFieldExceptionをスローする', () => {
      expect(() => CategoryName.create(null as unknown as string)).toThrow(RequiredFieldException)
      expect(() => CategoryName.create(null as unknown as string)).toThrow('値は必須です')
    })

    it('undefinedの場合、RequiredFieldExceptionをスローする', () => {
      expect(() => CategoryName.create(undefined as unknown as string)).toThrow(
        RequiredFieldException
      )
      expect(() => CategoryName.create(undefined as unknown as string)).toThrow('値は必須です')
    })

    it('21文字以上の場合、InvalidFieldExceptionをスローする', () => {
      // 最大長を超えるカテゴリー名を設定してエラーを検証
      const builder = new CategoryNameBuilder().withTooLongValue()
      expect(() => CategoryName.create(builder.getProps().value!)).toThrow(InvalidFieldException)
      expect(() => CategoryName.create(builder.getProps().value!)).toThrow(
        'カテゴリー名は20文字以内で入力してください'
      )
    })
  })

  describe('equals', () => {
    it('同じ値を持つインスタンスの場合、trueを返す', () => {
      // 同じ値のカテゴリー名を2つ作成
      const value = '野菜'
      const categoryName1 = new CategoryNameBuilder().withValue(value).build()
      const categoryName2 = new CategoryNameBuilder().withValue(value).build()
      expect(categoryName1.equals(categoryName2)).toBe(true)
    })

    it('異なる値を持つインスタンスの場合、falseを返す', () => {
      // 異なる値のカテゴリー名を2つ作成
      const categoryName1 = new CategoryNameBuilder().withValue('野菜').build()
      const categoryName2 = new CategoryNameBuilder().withValue('肉・魚').build()
      expect(categoryName1.equals(categoryName2)).toBe(false)
    })
  })
})
