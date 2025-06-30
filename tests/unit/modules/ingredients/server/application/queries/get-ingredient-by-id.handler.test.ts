import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GetIngredientByIdHandler } from '@/modules/ingredients/server/application/queries/get-ingredient-by-id.handler'
import { GetIngredientByIdQuery } from '@/modules/ingredients/server/application/queries/get-ingredient-by-id.query'
import type { IngredientQueryService } from '@/modules/ingredients/server/application/query-services/ingredient-query-service.interface'
import type { IngredientDetailView } from '@/modules/ingredients/server/application/views/ingredient-detail.view'
import { IngredientNotFoundException } from '@/modules/ingredients/server/domain/exceptions'

// モックQueryService
const mockQueryService: IngredientQueryService = {
  findDetailById: vi.fn(),
}

describe('GetIngredientByIdHandler', () => {
  let handler: GetIngredientByIdHandler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new GetIngredientByIdHandler(mockQueryService)
  })

  describe('execute', () => {
    const userId = 'user-123'
    const ingredientId = 'ingredient-456'

    it('QueryServiceを使って食材詳細を取得する', async () => {
      // Given: QueryServiceが有効なデータを返す
      const expectedView: IngredientDetailView = {
        id: ingredientId,
        userId: userId,
        name: 'トマト',
        categoryId: 'category-1',
        categoryName: '野菜',
        price: 200,
        purchaseDate: '2024-01-15',
        bestBeforeDate: '2024-01-25',
        useByDate: null,
        quantity: 3,
        unitId: 'unit-1',
        unitName: '個',
        unitSymbol: '個',
        storageType: 'REFRIGERATOR',
        storageDetail: '野菜室',
        threshold: 1,
        memo: '新鮮なトマト',
        createdAt: '2024-01-10T10:00:00.000Z',
        updatedAt: '2024-01-15T15:30:00.000Z',
      }

      mockQueryService.findDetailById = vi.fn().mockResolvedValue(expectedView)

      // When: ハンドラーを実行
      const query = new GetIngredientByIdQuery(userId, ingredientId)
      const result = await handler.execute(query)

      // Then: QueryServiceから取得したビューを返す
      expect(result).toEqual(expectedView)
      expect(mockQueryService.findDetailById).toHaveBeenCalledWith(userId, ingredientId)
    })

    it('食材が見つからない場合はIngredientNotFoundExceptionを投げる', async () => {
      // Given: QueryServiceがnullを返す
      mockQueryService.findDetailById = vi.fn().mockResolvedValue(null)

      // When: 存在しない食材でハンドラーを実行
      const query = new GetIngredientByIdQuery(userId, 'non-existent-id')

      // Then: IngredientNotFoundExceptionが投げられる
      await expect(handler.execute(query)).rejects.toThrow(IngredientNotFoundException)
      expect(mockQueryService.findDetailById).toHaveBeenCalledWith(userId, 'non-existent-id')
    })

    it('削除済み食材の場合はIngredientNotFoundExceptionを投げる', async () => {
      // Given: QueryServiceが削除済み食材でnullを返す
      mockQueryService.findDetailById = vi.fn().mockResolvedValue(null)

      // When: 削除済み食材でハンドラーを実行
      const query = new GetIngredientByIdQuery(userId, ingredientId)

      // Then: IngredientNotFoundExceptionが投げられる
      await expect(handler.execute(query)).rejects.toThrow(IngredientNotFoundException)
    })

    it('他ユーザーの食材にアクセスしようとした場合はIngredientNotFoundExceptionを投げる', async () => {
      // Given: QueryServiceが他ユーザーの食材でnullを返す
      mockQueryService.findDetailById = vi.fn().mockResolvedValue(null)

      // When: 他ユーザーの食材でハンドラーを実行
      const query = new GetIngredientByIdQuery('other-user', ingredientId)

      // Then: IngredientNotFoundExceptionが投げられる
      await expect(handler.execute(query)).rejects.toThrow(IngredientNotFoundException)
      expect(mockQueryService.findDetailById).toHaveBeenCalledWith('other-user', ingredientId)
    })
  })
})
