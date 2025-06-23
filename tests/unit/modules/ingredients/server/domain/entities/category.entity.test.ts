import { describe, expect, it } from 'vitest'

import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'

import { CategoryBuilder } from '../../../../../../__fixtures__/builders'

describe('Category', () => {
  describe('constructor', () => {
    it('カテゴリーを作成できる', () => {
      // ビルダーを使用してランダムなテストデータで検証
      const category = new CategoryBuilder().build()

      // Assert
      expect(category).toBeInstanceOf(Category)
      expect(category.getId()).toBeTruthy()
      expect(category.getName()).toBeTruthy()
      expect(category.getDisplayOrder()).toBeGreaterThanOrEqual(1)
      expect(category.getDisplayOrder()).toBeLessThanOrEqual(999)
    })

    it('指定したIDでカテゴリーを作成できる', () => {
      // 指定したIDでカテゴリーを作成
      const id = 'cat1'
      const category = new CategoryBuilder().withId(id).build()

      // Assert
      expect(category.getId()).toBe(id)
    })

    it('指定した名前でカテゴリーを作成できる', () => {
      // 野菜カテゴリーとして作成
      const category = new CategoryBuilder().asVegetable().build()

      // Assert
      expect(category.getName()).toBe('野菜')
      expect(category.getDisplayOrder()).toBe(1)
    })

    it('指定した表示順でカテゴリーを作成できる', () => {
      // 指定した表示順でカテゴリーを作成
      const displayOrder = 10
      const category = new CategoryBuilder().withDisplayOrder(displayOrder).build()

      // Assert
      expect(category.getDisplayOrder()).toBe(displayOrder)
    })
  })

  describe('プリセットカテゴリー', () => {
    it('野菜カテゴリーを作成できる', () => {
      // 野菜カテゴリーとして作成
      const category = new CategoryBuilder().asVegetable().build()

      // Assert
      expect(category.getName()).toBe('野菜')
      expect(category.getDisplayOrder()).toBe(1)
    })

    it('肉・魚カテゴリーを作成できる', () => {
      // 肉・魚カテゴリーとして作成
      const category = new CategoryBuilder().asMeatAndFish().build()

      // Assert
      expect(category.getName()).toBe('肉・魚')
      expect(category.getDisplayOrder()).toBe(2)
    })

    it('乳製品カテゴリーを作成できる', () => {
      // 乳製品カテゴリーとして作成
      const category = new CategoryBuilder().asDairy().build()

      // Assert
      expect(category.getName()).toBe('乳製品')
      expect(category.getDisplayOrder()).toBe(3)
    })
  })
})
