import { describe, it, expect } from 'vitest'

import { Category } from '@/modules/ingredients/server/domain/entities/category'

/**
 * Category Entity のテスト
 *
 * テスト対象:
 * - カテゴリーエンティティの生成とバリデーション
 * - ビジネスルールの適用（名前の必須チェック、表示順のデフォルト値）
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
      expect(category.id).toBe('cat1')
      expect(category.name).toBe('野菜')
      expect(category.displayOrder).toBe(1)
    })

    it('should throw error if name is empty', () => {
      // カテゴリー名が空の場合、ビジネスルールによりエラーがスローされることを確認
      // Arrange
      const categoryData = {
        id: 'cat1',
        name: '',
        displayOrder: 1,
      }

      // Act & Assert
      expect(() => new Category(categoryData)).toThrow('Category name cannot be empty')
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
      expect(category.displayOrder).toBe(0)
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
