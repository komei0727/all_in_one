import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories.handler'
import { GetCategoriesQuery } from '@/modules/ingredients/server/application/queries/get-categories.query'
import { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'

import { CategoryBuilder } from '../../../../../../__fixtures__/builders'

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
      const category1 = new CategoryBuilder().withDisplayOrder(1).build()
      const category2 = new CategoryBuilder().withDisplayOrder(2).build()
      const mockCategories = [category1, category2]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockCategories)

      const query = new GetCategoriesQuery()

      // Act
      const result = await handler.handle(query)

      // Assert
      expect(result).toEqual({
        categories: [
          {
            id: category1.getId(),
            name: category1.getName(),
            displayOrder: category1.getDisplayOrder(),
          },
          {
            id: category2.getId(),
            name: category2.getName(),
            displayOrder: category2.getDisplayOrder(),
          },
        ],
      })
      expect(mockRepository.findAllActive).toHaveBeenCalledOnce()
    })

    it('名前順でソートされたアクティブなカテゴリーを取得する', async () => {
      // sortBy: 'name'の場合のソート処理を確認
      // Arrange
      const category1 = new CategoryBuilder().withName('野菜').withDisplayOrder(2).build()
      const category2 = new CategoryBuilder().withName('肉類').withDisplayOrder(1).build()
      const category3 = new CategoryBuilder().withName('魚介類').withDisplayOrder(3).build()
      const mockCategories = [category1, category2, category3]
      vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockCategories)

      const query = new GetCategoriesQuery({ sortBy: 'name' })

      // Act
      const result = await handler.handle(query)

      // Assert
      // 名前順でソートされることを確認（魚介類 < 肉類 < 野菜）
      expect(result.categories[0].name).toBe('魚介類')
      expect(result.categories[1].name).toBe('肉類')
      expect(result.categories[2].name).toBe('野菜')
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
