import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories.handler'
import { GetCategoriesQuery } from '@/modules/ingredients/server/application/queries/get-categories.query'
import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'
import { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'

/**
 * GetCategoriesQueryHandler のテスト
 *
 * テスト対象:
 * - カテゴリー一覧取得のクエリハンドラー
 * - クエリオブジェクトに基づいた処理の分岐
 * - リポジトリから取得したエンティティをDTOに変換する処理
 */
describe('GetCategoriesQueryHandler', () => {
  let mockRepository: CategoryRepository
  let handler: GetCategoriesQueryHandler

  beforeEach(() => {
    // リポジトリのモックを作成
    mockRepository = {
      findAllActive: vi.fn(),
      findById: vi.fn(),
    }
    handler = new GetCategoriesQueryHandler(mockRepository)
  })

  describe('アクティブなカテゴリーのみ取得', () => {
    it('デフォルトのクエリでアクティブなカテゴリーを取得する', async () => {
      // デフォルトクエリ（includeInactive: false）の処理を確認
      // Arrange
      const mockCategories = [
        new Category({ id: 'cat1', name: '野菜', displayOrder: 1 }),
        new Category({ id: 'cat2', name: '肉類', displayOrder: 2 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockCategories)

      const query = new GetCategoriesQuery()

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        categories: [
          { id: 'cat1', name: '野菜', displayOrder: 1 },
          { id: 'cat2', name: '肉類', displayOrder: 2 },
        ],
      })
      expect(mockRepository.findAllActive).toHaveBeenCalledOnce()
    })

    it('名前順でソートされたアクティブなカテゴリーを取得する', async () => {
      // sortBy: 'name'の場合のソート処理を確認
      // Arrange
      const mockCategories = [
        new Category({ id: 'cat1', name: '野菜', displayOrder: 2 }),
        new Category({ id: 'cat2', name: '肉類', displayOrder: 1 }),
        new Category({ id: 'cat3', name: '魚介類', displayOrder: 3 }),
      ]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockCategories)

      const query = new GetCategoriesQuery({ sortBy: 'name' })

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        categories: [
          { id: 'cat3', name: '魚介類', displayOrder: 3 },
          { id: 'cat2', name: '肉類', displayOrder: 1 },
          { id: 'cat1', name: '野菜', displayOrder: 2 },
        ],
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('リポジトリエラーを適切に処理する', async () => {
      // リポジトリでエラーが発生した場合の処理を確認
      // Arrange
      const error = new Error('Database connection failed')
      vi.mocked(mockRepository.findAllActive).mockRejectedValue(error)

      const query = new GetCategoriesQuery()

      // Act & Assert
      await expect(handler.handle(query)).rejects.toThrow('Database connection failed')
    })
  })

  describe('空の結果', () => {
    it('カテゴリーが存在しない場合、空配列を返す', async () => {
      // データが存在しない場合の処理を確認
      // Arrange
      vi.mocked(mockRepository.findAllActive).mockResolvedValue([])

      const query = new GetCategoriesQuery()

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        categories: [],
      })
    })
  })
})
