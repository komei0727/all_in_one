import { describe, it, expect } from 'vitest'

import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'

/**
 * Category Entity のテスト
 *
 * テスト対象:
 * - カテゴリーエンティティの生成とバリデーション
 * - ビジネスルールの適用（値オブジェクトによる）
 * - シリアライズ機能
 */
describe('Category Entity', () => {
  describe('constructor', () => {
    it('should create a category with valid data', () => {
      // カテゴリーエンティティが正常なデータで生成できることを確認
      // Arrange
      const categoryData = {
        id: 'cat1',
        name: '野菜',
        displayOrder: 1,
      }

      // Act
      const category = new Category(categoryData)

      // Assert
      expect(category.id.getValue()).toBe('cat1')
      expect(category.name.getValue()).toBe('野菜')
      expect(category.displayOrder.getValue()).toBe(1)
    })

    it('should throw error if name is empty', () => {
      // カテゴリー名が空の場合、値オブジェクトのバリデーションによりエラーがスローされることを確認
      // Arrange
      const categoryData = {
        id: 'cat1',
        name: '',
        displayOrder: 1,
      }

      // Act & Assert
      expect(() => new Category(categoryData)).toThrow('カテゴリー名は必須です')
    })

    it('should use default display order if not provided', () => {
      // 表示順が指定されない場合、デフォルト値（0）が設定されることを確認
      // Arrange
      const categoryData = {
        id: 'cat1',
        name: '野菜',
      }

      // Act
      const category = new Category(categoryData)

      // Assert
      expect(category.displayOrder.getValue()).toBe(0)
    })
  })

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      // エンティティがプレーンオブジェクトとしてシリアライズできることを確認
      // これはAPIレスポンスやデータ永続化で使用される
      // Arrange
      const category = new Category({
        id: 'cat1',
        name: '野菜',
        displayOrder: 1,
      })

      // Act
      const json = category.toJSON()

      // Assert
      expect(json).toEqual({
        id: 'cat1',
        name: '野菜',
        displayOrder: 1,
      })
    })
  })
})
