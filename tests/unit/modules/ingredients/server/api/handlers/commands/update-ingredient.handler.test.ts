import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

import { UpdateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/update-ingredient.handler'
import type { UpdateIngredientRequest } from '@/modules/ingredients/server/api/validators/update-ingredient.validator'
import { UpdateIngredientCommand } from '@/modules/ingredients/server/application/commands/update-ingredient.command'
import type { UpdateIngredientHandler } from '@/modules/ingredients/server/application/commands/update-ingredient.handler'
import {
  NotFoundException,
  BusinessRuleException,
} from '@/modules/ingredients/server/domain/exceptions'
import { anIngredientDto } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('UpdateIngredientApiHandler', () => {
  let mockUpdateIngredientHandler: UpdateIngredientHandler
  let apiHandler: UpdateIngredientApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateIngredientHandler = {
      execute: vi.fn(),
    } as unknown as UpdateIngredientHandler
    apiHandler = new UpdateIngredientApiHandler(mockUpdateIngredientHandler)
  })

  // テストデータビルダー
  const createValidUpdateRequest = (): UpdateIngredientRequest => ({
    name: faker.commerce.productName(),
    categoryId: `cat_${faker.string.alphanumeric(20)}`,
    memo: faker.helpers.maybe(() => faker.lorem.sentence()) ?? undefined,
    price: faker.helpers.maybe(() => faker.number.int({ min: 100, max: 10000 })) ?? undefined,
    purchaseDate:
      faker.helpers.maybe(() => faker.date.recent().toISOString().split('T')[0]) ?? undefined,
    expiryInfo:
      faker.helpers.maybe(() => ({
        bestBeforeDate:
          faker.helpers.maybe(() => faker.date.future().toISOString().split('T')[0]) ?? undefined,
        useByDate:
          faker.helpers.maybe(() => faker.date.future().toISOString().split('T')[0]) ?? undefined,
      })) ?? undefined,
    stock:
      faker.helpers.maybe(() => ({
        quantity: faker.number.float({ min: 0.1, max: 100 }),
        unitId: `unit_${faker.string.alphanumeric(20)}`,
        storageLocation: {
          type: faker.helpers.arrayElement(['REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE']),
          detail: faker.helpers.maybe(() => faker.lorem.word()) ?? undefined,
        },
        threshold:
          faker.helpers.maybe(() => faker.number.float({ min: 0.1, max: 10 })) ?? undefined,
      })) ?? undefined,
  })

  const createIngredientId = () => `ing_${faker.string.alphanumeric(20)}`
  const createUserId = () => faker.string.uuid()

  describe('validate', () => {
    describe('正常系', () => {
      it('有効なリクエストデータをバリデートできる', () => {
        // Given: 有効なリクエストデータ
        const ingredientId = createIngredientId()
        const data = { ...createValidUpdateRequest(), ingredientId }

        // When: バリデーションを実行
        const result = apiHandler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual(data)
      })

      it('params形式のデータも処理できる', () => {
        // Given: params形式のデータ
        const ingredientId = createIngredientId()
        const data = { params: { ingredientId } }

        // When: バリデーションを実行
        const result = apiHandler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual({ ingredientId })
      })
    })

    describe('異常系', () => {
      it('空のリクエストでもバリデーションに通る', () => {
        // Given: 空のリクエスト（部分更新のため、すべてのフィールドがオプショナル）
        const ingredientId = createIngredientId()
        const data = { ingredientId }

        // When: バリデーションを実行
        const result = apiHandler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual({ ingredientId })
      })

      it('カテゴリIDが不正な形式の場合、バリデーションエラーが発生する', () => {
        // Given: 不正なカテゴリID
        const data = {
          name: faker.commerce.productName(),
          categoryId: 'short', // 8文字未満
        }

        // When/Then: バリデーションエラーが発生
        expect(() => apiHandler.validate(data)).toThrow(ZodError)
      })

      it('価格が負の値の場合、バリデーションエラーが発生する', () => {
        // Given: 負の価格
        const data = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
          price: -100,
        }

        // When/Then: バリデーションエラーが発生
        expect(() => apiHandler.validate(data)).toThrow(ZodError)
      })
    })
  })

  describe('execute', () => {
    describe('正常系', () => {
      it('有効なリクエストで食材を更新できる', async () => {
        // Given: 有効なリクエストとモックレスポンス
        const request = createValidUpdateRequest()
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const mockDto = anIngredientDto()
          .withId(ingredientId)
          .withName(request.name!)
          .withCategoryId(request.categoryId!)
          .build()

        vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        const requestWithId = { ...request, ingredientId }
        const result = await apiHandler.execute(requestWithId, userId)

        // Then: 食材DTOが返される
        expect(result).toBe(mockDto)

        // コマンドハンドラーが正しく呼び出されたことを確認
        expect(mockUpdateIngredientHandler.execute).toHaveBeenCalledWith(
          expect.any(UpdateIngredientCommand)
        )

        const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
        expect(actualCommand.id).toBe(ingredientId)
        expect(actualCommand.userId).toBe(userId)
        expect(actualCommand.name).toBe(request.name)
        expect(actualCommand.categoryId).toBe(request.categoryId)
      })

      it('必須項目のみで食材を更新できる', async () => {
        // Given: 最小限のリクエスト
        const request: UpdateIngredientRequest = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
        }
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const mockDto = anIngredientDto()
          .withId(ingredientId)
          .withName(request.name!)
          .withCategoryId(request.categoryId!)
          .build()

        vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        const requestWithId = { ...request, ingredientId }
        const result = await apiHandler.execute(requestWithId, userId)

        // Then: 食材DTOが返される
        expect(result).toBe(mockDto)

        // コマンドが適切に作成されたことを確認
        const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
        expect(actualCommand.name).toBe(request.name)
        expect(actualCommand.categoryId).toBe(request.categoryId)
        expect(actualCommand.memo).toBeUndefined()
        expect(actualCommand.price).toBeUndefined()
        expect(actualCommand.purchaseDate).toBeUndefined()
        expect(actualCommand.expiryInfo).toBeUndefined()
        expect(actualCommand.stock).toBeUndefined()
      })

      it('日付文字列を正しくDateオブジェクトに変換する', async () => {
        // Given: 日付を含むリクエスト
        const purchaseDateStr = faker.date.recent().toISOString().split('T')[0]
        const bestBeforeDateStr = faker.date.future().toISOString().split('T')[0]
        const useByDateStr = faker.date.future().toISOString().split('T')[0]

        const request: UpdateIngredientRequest = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
          purchaseDate: purchaseDateStr,
          expiryInfo: {
            bestBeforeDate: bestBeforeDateStr,
            useByDate: useByDateStr,
          },
        }
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const mockDto = anIngredientDto().build()

        vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        await apiHandler.execute({ ...request, ingredientId }, userId)

        // Then: 日付が正しく変換されたことを確認
        const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
        expect(actualCommand.purchaseDate).toEqual(new Date(purchaseDateStr))
        expect(actualCommand.expiryInfo?.bestBeforeDate).toEqual(new Date(bestBeforeDateStr))
        expect(actualCommand.expiryInfo?.useByDate).toEqual(new Date(useByDateStr))
      })

      it('在庫情報を正しく処理する', async () => {
        // Given: 在庫情報を含むリクエスト
        const request: UpdateIngredientRequest = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
          stock: {
            quantity: faker.number.float({ min: 1, max: 100 }),
            unitId: testDataHelpers.unitId(),
            storageLocation: {
              type: 'REFRIGERATED',
              detail: faker.lorem.word(),
            },
            threshold: faker.number.float({ min: 0.1, max: 10 }),
          },
        }
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const mockDto = anIngredientDto().build()

        vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        await apiHandler.execute({ ...request, ingredientId }, userId)

        // Then: 在庫情報が正しく処理されたことを確認
        const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
        expect(actualCommand.stock).toEqual({
          quantity: request.stock!.quantity,
          unitId: request.stock!.unitId,
          storageLocation: {
            type: request.stock!.storageLocation.type,
            detail: request.stock!.storageLocation.detail,
          },
          threshold: request.stock!.threshold,
        })
      })

      it('在庫詳細なしでも正しく処理する', async () => {
        // Given: 在庫詳細なしのリクエスト
        const request: UpdateIngredientRequest = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
          stock: {
            quantity: faker.number.float({ min: 1, max: 100 }),
            unitId: testDataHelpers.unitId(),
            storageLocation: {
              type: 'ROOM_TEMPERATURE',
            },
          },
        }
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const mockDto = anIngredientDto().build()

        vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        await apiHandler.execute({ ...request, ingredientId }, userId)

        // Then: 在庫情報が正しく処理されたことを確認
        const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
        expect(actualCommand.stock?.storageLocation.detail).toBeNull()
        expect(actualCommand.stock?.threshold).toBeNull()
      })

      it('expiryInfoがnullの場合を正しく処理する', async () => {
        // Given: expiryInfoがnullのリクエスト
        const request: UpdateIngredientRequest = {
          name: faker.commerce.productName(),
          categoryId: testDataHelpers.categoryId(),
          expiryInfo: null,
        }
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const mockDto = anIngredientDto().build()

        vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        await apiHandler.execute({ ...request, ingredientId }, userId)

        // Then: expiryInfoがnullとして処理されたことを確認
        const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
        expect(actualCommand.expiryInfo).toBeNull()
      })
    })

    describe('異常系', () => {
      it('食材が見つからない場合、NotFoundExceptionがそのまま伝播する', async () => {
        // Given: 存在しない食材
        const request = createValidUpdateRequest()
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const error = new NotFoundException('Ingredient', ingredientId)

        vi.mocked(mockUpdateIngredientHandler.execute).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(apiHandler.execute({ ...request, ingredientId }, userId)).rejects.toThrow(
          error
        )
      })

      it('ビジネスルール違反の場合、BusinessRuleExceptionがそのまま伝播する', async () => {
        // Given: 権限がないユーザー
        const request = createValidUpdateRequest()
        const ingredientId = createIngredientId()
        const userId = createUserId()
        const error = new BusinessRuleException('この食材を更新する権限がありません')

        vi.mocked(mockUpdateIngredientHandler.execute).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(apiHandler.execute({ ...request, ingredientId }, userId)).rejects.toThrow(
          error
        )
      })
    })
  })

  describe('handle (統合)', () => {
    it('BaseApiHandlerの例外変換機能が正しく動作する', async () => {
      // Given: Zodバリデーションエラー
      const data = {
        // 必須フィールドが欠落
        categoryId: 'short', // 不正な形式
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()

      // When: handleメソッドを実行
      const resultPromise = apiHandler.handle({ ...data, ingredientId }, userId)

      // Then: ApiValidationExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
      })

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockUpdateIngredientHandler.execute).not.toHaveBeenCalled()
    })

    it('ドメイン例外が適切にAPI例外に変換される', async () => {
      // Given: NotFoundException
      const request = createValidUpdateRequest()
      const ingredientId = createIngredientId()
      const userId = createUserId()
      const error = new NotFoundException('Ingredient', ingredientId)

      vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(
        anIngredientDto().build()
      )

      // まずexecuteが正常に動作することを確認
      await apiHandler.execute({ ...request, ingredientId }, userId)

      // 次にエラーをモック
      vi.mocked(mockUpdateIngredientHandler.execute).mockRejectedValueOnce(error)

      // When: handleメソッドを実行
      const resultPromise = apiHandler.handle({ ...request, ingredientId }, userId)

      // Then: ApiNotFoundExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'RESOURCE_NOT_FOUND',
      })
    })

    it('正常系でDTOが返される', async () => {
      // Given: 正常なリクエスト
      const request = createValidUpdateRequest()
      const ingredientId = createIngredientId()
      const userId = createUserId()
      const mockDto = anIngredientDto()
        .withId(ingredientId)
        .withName(request.name!)
        .withCategoryId(request.categoryId!)
        .build()

      vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

      // When: handleメソッドを実行
      const result = await apiHandler.handle({ ...request, ingredientId }, userId)

      // Then: DTOが返される
      expect(result).toBe(mockDto)
    })
  })
})
