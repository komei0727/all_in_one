import { createId } from '@paralleldrive/cuid2'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

import { CreateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/create-ingredient.handler'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'
import { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'

/**
 * CreateIngredientApiHandler のテスト
 *
 * テスト対象:
 * - APIハンドラーのエラーハンドリング処理
 * - ZodErrorからValidationExceptionへの変換
 */
describe('CreateIngredientApiHandler', () => {
  let handler: CreateIngredientApiHandler
  let mockCommandHandler: CreateIngredientHandler
  let mockCategoryRepo: CategoryRepository
  let mockUnitRepo: UnitRepository

  beforeEach(() => {
    // モックの作成
    mockCommandHandler = {
      execute: vi.fn(),
    } as unknown as CreateIngredientHandler

    mockCategoryRepo = {
      findById: vi.fn(),
    } as unknown as CategoryRepository

    mockUnitRepo = {
      findById: vi.fn(),
    } as unknown as UnitRepository

    handler = new CreateIngredientApiHandler(mockCommandHandler, mockCategoryRepo, mockUnitRepo)
  })

  describe('エラーハンドリング', () => {
    it('ZodErrorをValidationExceptionに変換する', async () => {
      // テスト用の無効なリクエスト（名前が空文字列）
      const invalidRequest = {
        name: '', // 空文字列でバリデーションエラー
        categoryId: createId(),
        quantity: {
          amount: 3,
          unitId: createId(),
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
        },
        purchaseDate: '2024-12-20',
      }

      // ZodErrorがスローされることを確認
      await expect(handler.handle(invalidRequest)).rejects.toThrow('name: 食材名は必須です')
    })

    it('複数のバリデーションエラーを結合する', async () => {
      // テスト用の無効なリクエスト（複数のエラー）
      const invalidRequest = {
        name: '', // 空文字列
        categoryId: 'invalid-cuid', // 無効なCUID
        quantity: {
          amount: -1, // 負の値
          unitId: createId(),
        },
        storageLocation: {
          type: 'INVALID_TYPE' as unknown as 'REFRIGERATED', // 無効な保管場所タイプ
        },
        purchaseDate: '2024-12-20',
      }

      // 複数のエラーメッセージが結合されることを確認
      await expect(handler.handle(invalidRequest)).rejects.toThrow(
        /name:.*quantity.amount:.*storageLocation.type:/
      )
    })

    it('ZodError以外のエラーはそのままスローする', async () => {
      // 正常なリクエスト
      const categoryId = createId()
      const validRequest = {
        name: 'トマト',
        categoryId: categoryId,
        quantity: {
          amount: 3,
          unitId: createId(),
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
        },
        purchaseDate: '2024-12-20',
      }

      // コマンドハンドラーが別のエラーをスローするように設定
      const customError = new Error('データベースエラー')
      ;(mockCommandHandler.execute as Mock).mockRejectedValue(customError)

      // モックカテゴリーとユニット
      const mockCategory = new Category({
        id: categoryId,
        name: '野菜',
        displayOrder: 1,
      })
      ;(mockCategoryRepo.findById as Mock).mockResolvedValue(mockCategory)

      // 元のエラーがそのままスローされることを確認
      await expect(handler.handle(validRequest)).rejects.toThrow('データベースエラー')
    })
  })
})
