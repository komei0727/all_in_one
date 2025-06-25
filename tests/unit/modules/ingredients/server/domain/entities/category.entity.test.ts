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

    it('説明付きでカテゴリーを作成できる', () => {
      // 説明付きのカテゴリーを作成
      const description = '新鮮な野菜類を管理するカテゴリーです'
      const category = new CategoryBuilder().withName('野菜').withDescription(description).build()

      // Assert
      expect(category.getDescription()).toBe(description)
    })

    it('説明がnullのカテゴリーを作成できる', () => {
      // 説明なしのカテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').withDescription(null).build()

      // Assert
      expect(category.getDescription()).toBeNull()
    })

    it('説明が100文字以内であることを確認', () => {
      // 100文字以内の説明は許可される
      const validDescription = 'あ'.repeat(100) // 100文字の説明
      const category = new CategoryBuilder().withDescription(validDescription).build()

      // Assert
      expect(category.getDescription()).toBe(validDescription)
    })

    it('displayOrderが指定されない場合はデフォルト値を使用する', () => {
      // Arrange & Act
      const category = new Category({
        id: 'cat1',
        name: '野菜',
        // displayOrderを指定しない
      })

      // Assert
      expect(category.getDisplayOrder()).toBe(0) // DisplayOrder.default()の値
    })
  })

  describe('toJSON', () => {
    it('オブジェクトに変換できる', () => {
      // Arrange
      const category = new CategoryBuilder()
        .withId('cat1')
        .withName('野菜')
        .withDisplayOrder(5)
        .build()

      // Act
      const json = category.toJSON()

      // Assert
      expect(json).toEqual({
        id: 'cat1',
        name: '野菜',
        description: null, // デフォルトはnull
        displayOrder: 5,
      })
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
