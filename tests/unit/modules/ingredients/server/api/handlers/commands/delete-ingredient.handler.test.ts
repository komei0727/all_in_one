import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/delete-ingredient.handler'
import { type DeleteIngredientHandler } from '@/modules/ingredients/server/application/commands/delete-ingredient.handler'
import {
  NotFoundException,
  BusinessRuleException,
  ValidationException,
} from '@/modules/ingredients/server/domain/exceptions'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * DeleteIngredientApiHandler のテスト
 *
 * テスト対象:
 * - BaseApiHandlerパターンの実装
 * - validate()メソッドのZodバリデーション
 * - execute()メソッドのビジネスロジック実行
 * - handle()メソッドの例外変換機能
 */
describe('DeleteIngredientApiHandler', () => {
  let handler: DeleteIngredientApiHandler
  let mockDeleteIngredientHandler: DeleteIngredientHandler

  beforeEach(() => {
    // モックの作成
    mockDeleteIngredientHandler = {
      execute: vi.fn(),
    } as unknown as DeleteIngredientHandler

    handler = new DeleteIngredientApiHandler(mockDeleteIngredientHandler)
  })

  describe('validate', () => {
    describe('正常系', () => {
      it('有効なingredientIdを含むリクエストを検証できる', () => {
        // Given: 有効なingredientId
        const ingredientId = testDataHelpers.ingredientId()
        const data = { ingredientId }

        // When: バリデーションを実行
        const result = handler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される（id として返される）
        expect(result).toEqual({ id: ingredientId })
      })

      it('params形式のデータも処理できる', () => {
        // Given: params形式のデータ
        const ingredientId = testDataHelpers.ingredientId()
        const data = { params: { ingredientId } }

        // When: バリデーションを実行
        const result = handler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される（id として返される）
        expect(result).toEqual({ id: ingredientId })
      })
    })

    describe('異常系', () => {
      it('ingredientIdが不正な形式の場合、バリデーションエラーが発生する', () => {
        // Given: 不正なingredientId
        const data = { ingredientId: 'invalid-id' }

        // When/Then: バリデーションエラーが発生
        expect(() => handler.validate(data)).toThrow(ValidationException)
      })

      it('ingredientIdが欠落している場合、バリデーションエラーが発生する', () => {
        // Given: ingredientIdなし
        const data = {}

        // When/Then: バリデーションエラーが発生
        expect(() => handler.validate(data)).toThrow(ValidationException)
      })
    })
  })

  describe('execute', () => {
    describe('正常系', () => {
      it('有効なリクエストで食材を削除できる', async () => {
        // Given: 有効なリクエスト
        const ingredientId = testDataHelpers.ingredientId()
        const userId = testDataHelpers.userId()

        vi.mocked(mockDeleteIngredientHandler.execute).mockResolvedValueOnce(undefined)

        // When: ハンドラーを実行
        const result = await handler.execute({ id: ingredientId }, userId)

        // Then: undefinedが返される（削除成功）
        expect(result).toBeUndefined()
        expect(mockDeleteIngredientHandler.execute).toHaveBeenCalledWith({
          id: ingredientId,
          userId,
        })
      })
    })

    describe('異常系', () => {
      it('食材が見つからない場合、NotFoundExceptionがそのまま伝播する', async () => {
        // Given: 存在しない食材
        const ingredientId = testDataHelpers.ingredientId()
        const userId = testDataHelpers.userId()
        const error = new NotFoundException('Ingredient', ingredientId)

        vi.mocked(mockDeleteIngredientHandler.execute).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({ id: ingredientId }, userId)).rejects.toThrow(error)
      })

      it('ビジネスルール違反の場合、BusinessRuleExceptionがそのまま伝播する', async () => {
        // Given: 他のユーザーの食材
        const ingredientId = testDataHelpers.ingredientId()
        const userId = testDataHelpers.userId()
        const error = new BusinessRuleException('この食材を削除する権限がありません')

        vi.mocked(mockDeleteIngredientHandler.execute).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({ id: ingredientId }, userId)).rejects.toThrow(error)
      })

      it('消費中の食材を削除しようとした場合、BusinessRuleExceptionがそのまま伝播する', async () => {
        // Given: 消費中の食材
        const ingredientId = testDataHelpers.ingredientId()
        const userId = testDataHelpers.userId()
        const error = new BusinessRuleException('消費中の食材は削除できません')

        vi.mocked(mockDeleteIngredientHandler.execute).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute({ id: ingredientId }, userId)).rejects.toThrow(error)
      })
    })
  })

  describe('handle (統合)', () => {
    it('BaseApiHandlerの例外変換機能が正しく動作する', async () => {
      // Given: Zodバリデーションエラー
      const data = { ingredientId: 'invalid-id' }
      const userId = testDataHelpers.userId()

      // When: handleメソッドを実行
      const resultPromise = handler.handle(data, userId)

      // Then: ApiValidationExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
      })
    })

    it('ドメイン例外が適切にAPI例外に変換される', async () => {
      // Given: NotFoundException
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()
      const error = new NotFoundException('Ingredient', ingredientId)

      vi.mocked(mockDeleteIngredientHandler.execute).mockRejectedValueOnce(error)

      // When: handleメソッドを実行
      const resultPromise = handler.handle({ ingredientId }, userId)

      // Then: ApiNotFoundExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'RESOURCE_NOT_FOUND',
      })
    })

    it('正常系でundefinedが返される', async () => {
      // Given: 正常なリクエスト
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataHelpers.userId()

      vi.mocked(mockDeleteIngredientHandler.execute).mockResolvedValueOnce(undefined)

      // When: handleメソッドを実行
      const result = await handler.handle({ ingredientId }, userId)

      // Then: undefinedが返される
      expect(result).toBeUndefined()
    })
  })
})
