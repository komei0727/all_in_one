import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories'
import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'
import { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'

/**
 * GetCategoriesQueryHandler のテスト
 *
 * テスト対象:
 * - カテゴリー一覧取得のクエリハンドラー
 * - リポジトリから取得したエンティティをDTOに変換する処理
 * - CQRSパターンにおけるQuery側の実装
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

  it('should return active categories as DTOs', async () => {
    // アクティブなカテゴリーを取得し、DTOとして返すことを確認
    // Arrange
    const mockCategories = [
      new Category({ id: 'cat1', name: '野菜', displayOrder: 1 }),
      new Category({ id: 'cat2', name: '肉類', displayOrder: 2 }),
    ]
    vi.mocked(mockRepository.findAllActive).mockResolvedValue(mockCategories)

    // Act
    const result = await handler.execute()

    // Assert
    expect(result).toEqual({
      categories: [
        { id: 'cat1', name: '野菜', displayOrder: 1 },
        { id: 'cat2', name: '肉類', displayOrder: 2 },
      ],
    })
    expect(mockRepository.findAllActive).toHaveBeenCalledOnce()
  })

  it('should return empty array when no categories exist', async () => {
    // カテゴリーが存在しない場合、空配列を返すことを確認
    // Arrange
    vi.mocked(mockRepository.findAllActive).mockResolvedValue([])

    // Act
    const result = await handler.execute()

    // Assert
    expect(result).toEqual({
      categories: [],
    })
  })

  it('should handle repository errors', async () => {
    // リポジトリでエラーが発生した場合の処理を確認
    // Arrange
    const error = new Error('Database connection failed')
    vi.mocked(mockRepository.findAllActive).mockRejectedValue(error)

    // Act & Assert
    await expect(handler.execute()).rejects.toThrow('Database connection failed')
  })
})
