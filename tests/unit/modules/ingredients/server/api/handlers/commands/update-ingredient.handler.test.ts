import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UpdateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/update-ingredient.handler'
import type { UpdateIngredientRequest } from '@/modules/ingredients/server/api/validators/update-ingredient.validator'
import { UpdateIngredientCommand } from '@/modules/ingredients/server/application/commands/update-ingredient.command'
import type { UpdateIngredientHandler } from '@/modules/ingredients/server/application/commands/update-ingredient.handler'
import { ValidationException } from '@/modules/ingredients/server/domain/exceptions'
import { anIngredientDto } from '@tests/__fixtures__/builders'

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

  describe('正常系', () => {
    it('有効なリクエストで食材を更新できる', async () => {
      // テストデータの準備
      const request = createValidUpdateRequest()
      const ingredientId = createIngredientId()
      const userId = createUserId()
      const mockDto = anIngredientDto()
        .withId(ingredientId)
        .withName(request.name!)
        .withCategoryId(request.categoryId!)
        .build()

      vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

      // APIハンドラーを実行
      const result = await apiHandler.handle(request, ingredientId, userId)

      // 結果の検証
      expect(result).toEqual(mockDto.toJSON())

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
      // 最小限のリクエスト
      const request: UpdateIngredientRequest = {
        name: faker.commerce.productName(),
        categoryId: `cat_${faker.string.alphanumeric(20)}`,
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()
      const mockDto = anIngredientDto()
        .withId(ingredientId)
        .withName(request.name!)
        .withCategoryId(request.categoryId!)
        .build()

      vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

      // APIハンドラーを実行
      const result = await apiHandler.handle(request, ingredientId, userId)

      // 結果の検証
      expect(result).toEqual(mockDto.toJSON())

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
      // 日付を含むリクエスト
      const purchaseDateStr = faker.date.recent().toISOString().split('T')[0]
      const bestBeforeDateStr = faker.date.future().toISOString().split('T')[0]
      const useByDateStr = faker.date.future().toISOString().split('T')[0]

      const request: UpdateIngredientRequest = {
        name: faker.commerce.productName(),
        categoryId: `cat_${faker.string.alphanumeric(20)}`,
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

      // APIハンドラーを実行
      await apiHandler.handle(request, ingredientId, userId)

      // 日付が正しく変換されたことを確認
      const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
      expect(actualCommand.purchaseDate).toEqual(new Date(purchaseDateStr))
      expect(actualCommand.expiryInfo?.bestBeforeDate).toEqual(new Date(bestBeforeDateStr))
      expect(actualCommand.expiryInfo?.useByDate).toEqual(new Date(useByDateStr))
    })

    it('在庫情報を正しく処理する', async () => {
      // 在庫情報を含むリクエスト
      const request: UpdateIngredientRequest = {
        name: faker.commerce.productName(),
        categoryId: `cat_${faker.string.alphanumeric(20)}`,
        stock: {
          quantity: faker.number.float({ min: 1, max: 100 }),
          unitId: `unit_${faker.string.alphanumeric(20)}`,
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

      // APIハンドラーを実行
      await apiHandler.handle(request, ingredientId, userId)

      // 在庫情報が正しく処理されたことを確認
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
      // 在庫詳細なしのリクエスト
      const request: UpdateIngredientRequest = {
        name: faker.commerce.productName(),
        categoryId: `cat_${faker.string.alphanumeric(20)}`,
        stock: {
          quantity: faker.number.float({ min: 1, max: 100 }),
          unitId: `unit_${faker.string.alphanumeric(20)}`,
          storageLocation: {
            type: 'ROOM_TEMPERATURE',
          },
        },
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()
      const mockDto = anIngredientDto().build()

      vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

      // APIハンドラーを実行
      await apiHandler.handle(request, ingredientId, userId)

      // 在庫情報が正しく処理されたことを確認
      const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
      expect(actualCommand.stock?.storageLocation.detail).toBeNull()
      expect(actualCommand.stock?.threshold).toBeNull()
    })

    it('expiryInfoがnullの場合を正しく処理する', async () => {
      // expiryInfoがnullのリクエスト
      const request: UpdateIngredientRequest = {
        name: faker.commerce.productName(),
        categoryId: `cat_${faker.string.alphanumeric(20)}`,
        expiryInfo: null,
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()
      const mockDto = anIngredientDto().build()

      vi.mocked(mockUpdateIngredientHandler.execute).mockResolvedValueOnce(mockDto)

      // APIハンドラーを実行
      await apiHandler.handle(request, ingredientId, userId)

      // expiryInfoがnullとして処理されたことを確認
      const actualCommand = vi.mocked(mockUpdateIngredientHandler.execute).mock.calls[0][0]
      expect(actualCommand.expiryInfo).toBeNull()
    })
  })

  describe('異常系', () => {
    it('不正なリクエストボディの場合はValidationExceptionを投げる', async () => {
      // 不正なリクエスト（必須項目なし）
      const invalidRequest = {
        // nameがない
        categoryId: `cat${faker.number.int({ min: 1, max: 10 })}`,
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()

      // ValidationExceptionが投げられることを確認
      await expect(apiHandler.handle(invalidRequest, ingredientId, userId)).rejects.toThrow(
        ValidationException
      )

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockUpdateIngredientHandler.execute).not.toHaveBeenCalled()
    })

    it('categoryIdが不正な場合はValidationExceptionを投げる', async () => {
      // 不正なcategoryIdのリクエスト（8文字未満）
      const invalidRequest = {
        name: faker.commerce.productName(),
        categoryId: 'short',
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()

      // ValidationExceptionが投げられることを確認
      await expect(apiHandler.handle(invalidRequest, ingredientId, userId)).rejects.toThrow(
        ValidationException
      )

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockUpdateIngredientHandler.execute).not.toHaveBeenCalled()
    })

    it('価格が負の値の場合はValidationExceptionを投げる', async () => {
      const invalidRequest = {
        name: faker.commerce.productName(),
        price: -100,
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()

      // ValidationExceptionが投げられることを確認
      await expect(apiHandler.handle(invalidRequest, ingredientId, userId)).rejects.toThrow(
        ValidationException
      )

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockUpdateIngredientHandler.execute).not.toHaveBeenCalled()
    })

    it('nullのリクエストボディの場合はValidationExceptionを投げる', async () => {
      const ingredientId = createIngredientId()
      const userId = createUserId()

      // ValidationExceptionが投げられることを確認
      await expect(apiHandler.handle(null, ingredientId, userId)).rejects.toThrow(
        ValidationException
      )

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockUpdateIngredientHandler.execute).not.toHaveBeenCalled()
    })

    it('文字列のリクエストボディの場合はValidationExceptionを投げる', async () => {
      const ingredientId = createIngredientId()
      const userId = createUserId()

      // ValidationExceptionが投げられることを確認
      await expect(apiHandler.handle('invalid request', ingredientId, userId)).rejects.toThrow(
        ValidationException
      )

      // コマンドハンドラーが呼び出されていないことを確認
      expect(mockUpdateIngredientHandler.execute).not.toHaveBeenCalled()
    })

    it('バリデーションエラーメッセージが適切に設定される', async () => {
      // 不正なリクエスト（価格が負の値）
      const invalidRequest = {
        price: -50,
      }
      const ingredientId = createIngredientId()
      const userId = createUserId()

      try {
        await apiHandler.handle(invalidRequest, ingredientId, userId)
        throw new Error('ValidationException should be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException)
        const validationError = error as ValidationException
        expect(validationError.message).toBeTruthy()
        expect(typeof validationError.message).toBe('string')
      }
    })
  })
})
