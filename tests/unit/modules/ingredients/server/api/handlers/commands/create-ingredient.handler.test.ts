import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

import { CreateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/create-ingredient.handler'
import { type CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { IngredientDto } from '@/modules/ingredients/server/application/dtos/ingredient.dto'
import {
  NotFoundException,
  BusinessRuleException,
} from '@/modules/ingredients/server/domain/exceptions'
import { IngredientBuilder } from '@tests/__fixtures__/builders/entities/ingredient.builder'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * CreateIngredientApiHandler のテスト
 *
 * テスト対象:
 * - BaseApiHandlerパターンの実装
 * - validate()メソッドのZodバリデーション
 * - execute()メソッドのビジネスロジック実行
 * - handle()メソッドの例外変換機能
 */
describe('CreateIngredientApiHandler', () => {
  let handler: CreateIngredientApiHandler
  let mockCommandHandler: CreateIngredientHandler

  beforeEach(() => {
    // モックの作成
    mockCommandHandler = {
      execute: vi.fn(),
    } as unknown as CreateIngredientHandler

    handler = new CreateIngredientApiHandler(mockCommandHandler)
  })

  describe('validate', () => {
    describe('正常系', () => {
      it('有効なリクエストデータをバリデートできる', () => {
        // Given: 有効なリクエストデータ
        const ingredientData = new IngredientBuilder().build()
        const requestData = {
          name: ingredientData.getName().getValue(),
          categoryId: testDataHelpers.categoryId(),
          quantity: {
            amount: faker.number.int({ min: 1, max: 100 }),
            unitId: testDataHelpers.unitId(),
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
            detail: faker.lorem.word(),
          },
          purchaseDate: faker.date.recent().toISOString().split('T')[0],
        }

        // When: バリデーションを実行
        const result = handler.validate(requestData)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual(requestData)
      })
    })

    describe('異常系', () => {
      it('名前が空文字列の場合、バリデーションエラーが発生する', () => {
        // Given: 無効なリクエスト（名前が空文字列）
        const invalidRequest = {
          name: '', // 空文字列でバリデーションエラー
          categoryId: testDataHelpers.categoryId(),
          quantity: {
            amount: 3,
            unitId: testDataHelpers.unitId(),
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: faker.date.recent().toISOString().split('T')[0],
        }

        // When/Then: ZodErrorがスローされる
        expect(() => handler.validate(invalidRequest)).toThrow(ZodError)
      })

      it('必須フィールドが欠落している場合、バリデーションエラーが発生する', () => {
        // Given: 必須フィールドが欠落
        const invalidRequest = {
          categoryId: testDataHelpers.categoryId(),
          // nameが欠落
        }

        // When/Then: ZodErrorがスローされる
        expect(() => handler.validate(invalidRequest)).toThrow(ZodError)
      })

      it('複数のバリデーションエラーが発生する', () => {
        // Given: 複数の無効なフィールド
        const invalidRequest = {
          name: '', // 空文字列
          categoryId: 'invalid-uuid', // 無効なUUID
          quantity: {
            amount: -1, // 負の値
            unitId: testDataHelpers.unitId(),
          },
          storageLocation: {
            type: 'INVALID_TYPE' as any, // 無効な保管場所タイプ
          },
          purchaseDate: faker.date.recent().toISOString().split('T')[0],
        }

        // When/Then: ZodErrorがスローされる
        expect(() => handler.validate(invalidRequest)).toThrow(ZodError)
        try {
          handler.validate(invalidRequest)
        } catch (error) {
          if (error instanceof ZodError) {
            // 複数のエラーが含まれることを確認
            expect(error.errors.length).toBeGreaterThan(1)
          }
        }
      })
    })
  })

  describe('execute', () => {
    describe('正常系', () => {
      it('有効なリクエストで食材を作成できる', async () => {
        // Given: 有効なリクエストとモックレスポンス
        const ingredientData = new IngredientBuilder().build()
        const userId = testDataHelpers.userId()

        const requestData = {
          name: ingredientData.getName().getValue(),
          categoryId: testDataHelpers.categoryId(),
          quantity: {
            amount: faker.number.int({ min: 1, max: 100 }),
            unitId: testDataHelpers.unitId(),
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
            detail: faker.lorem.word(),
          },
          purchaseDate: faker.date.recent().toISOString().split('T')[0],
        }

        const ingredientDto = new IngredientDto(
          ingredientData.getId().getValue(),
          userId,
          ingredientData.getName().getValue(),
          {
            id: requestData.categoryId,
            name: faker.commerce.department(),
          },
          null, // price
          ingredientData.getPurchaseDate().toISOString(),
          {
            bestBeforeDate: null,
            useByDate: null,
          },
          {
            quantity: requestData.quantity.amount,
            unit: {
              id: requestData.quantity.unitId,
              name: faker.lorem.word(),
              symbol: faker.lorem.word(),
            },
            storageLocation: requestData.storageLocation,
            threshold: null,
          },
          null, // memo
          ingredientData.getCreatedAt().toISOString(),
          ingredientData.getUpdatedAt().toISOString()
        )

        vi.mocked(mockCommandHandler.execute).mockResolvedValueOnce(ingredientDto)

        // When: ハンドラーを実行
        const result = await handler.execute(requestData, userId)

        // Then: 食材DTOが返される
        expect(result).toBe(ingredientDto)
        expect(mockCommandHandler.execute).toHaveBeenCalledWith({
          ...requestData,
          userId,
        })
      })
    })

    describe('異常系', () => {
      it('カテゴリが見つからない場合、NotFoundExceptionがそのまま伝播する', async () => {
        // Given: 存在しないカテゴリ
        const requestData = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
          quantity: {
            amount: faker.number.int({ min: 1, max: 100 }),
            unitId: testDataHelpers.unitId(),
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: faker.date.recent().toISOString().split('T')[0],
        }
        const userId = testDataHelpers.userId()
        const error = new NotFoundException('Category', requestData.categoryId)

        vi.mocked(mockCommandHandler.execute).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute(requestData, userId)).rejects.toThrow(error)
      })

      it('ビジネスルール違反の場合、BusinessRuleExceptionがそのまま伝播する', async () => {
        // Given: ビジネスルール違反
        const requestData = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
          quantity: {
            amount: faker.number.int({ min: 1, max: 100 }),
            unitId: testDataHelpers.unitId(),
          },
          storageLocation: {
            type: 'REFRIGERATED' as const,
          },
          purchaseDate: faker.date.recent().toISOString().split('T')[0],
        }
        const userId = testDataHelpers.userId()
        const error = new BusinessRuleException('重複する食材名です')

        vi.mocked(mockCommandHandler.execute).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute(requestData, userId)).rejects.toThrow(error)
      })
    })
  })

  describe('handle (統合)', () => {
    it('BaseApiHandlerの例外変換機能が正しく動作する', async () => {
      // Given: Zodバリデーションエラー
      const data = {
        name: '',
        categoryId: 'invalid-id',
        // 他の必須フィールドが欠落
      }
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
      const requestData = {
        name: faker.commerce.productName(),
        categoryId: testDataHelpers.categoryId(),
        quantity: {
          amount: faker.number.int({ min: 1, max: 100 }),
          unitId: testDataHelpers.unitId(),
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
        },
        purchaseDate: faker.date.recent().toISOString().split('T')[0],
      }
      const userId = testDataHelpers.userId()
      const error = new NotFoundException('Category', requestData.categoryId)

      vi.mocked(mockCommandHandler.execute).mockRejectedValueOnce(error)

      // When: handleメソッドを実行
      const resultPromise = handler.handle(requestData, userId)

      // Then: ApiNotFoundExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'RESOURCE_NOT_FOUND',
      })
    })
  })
})
