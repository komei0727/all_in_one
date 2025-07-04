import { faker } from '@faker-js/faker'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'

import { StartShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler'
import type { StartShoppingSessionRequest } from '@/modules/ingredients/server/api/validators/start-shopping-session.validator'
import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'
import type { StartShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/start-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { BusinessRuleException } from '@/modules/ingredients/server/domain/exceptions'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders/entities/shopping-session.builder'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * StartShoppingSessionApiHandler のテスト
 *
 * テスト対象:
 * - BaseApiHandlerパターンの実装
 * - validate()メソッドのZodバリデーション
 * - execute()メソッドのビジネスロジック実行
 * - handle()メソッドの例外変換機能
 */
describe('StartShoppingSessionApiHandler', () => {
  // コマンドハンドラーのモック
  let mockCommandHandler: StartShoppingSessionHandler
  let handler: StartShoppingSessionApiHandler

  beforeEach(() => {
    mockCommandHandler = {
      handle: vi.fn(),
    } as unknown as StartShoppingSessionHandler
    handler = new StartShoppingSessionApiHandler(mockCommandHandler)
  })

  // テストデータビルダー
  const createValidRequest = (): StartShoppingSessionRequest => ({
    deviceType: faker.helpers.arrayElement(['MOBILE', 'TABLET', 'DESKTOP'] as const),
    location: faker.helpers.maybe(() => ({
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      name: faker.location.streetAddress(),
    })),
  })

  const createMockSessionDto = (userId: string) => {
    const session = new ShoppingSessionBuilder().withUserId(userId).withActiveStatus().build()

    return new ShoppingSessionDto(
      session.getId().getValue(),
      session.getUserId(),
      session.getStatus().getValue(),
      session.getStartedAt().toISOString(),
      null,
      session.getDeviceType()?.getValue() || null,
      session.getLocation()
        ? {
            name: session.getLocationName() || undefined,
          }
        : null,
      []
    )
  }

  describe('validate', () => {
    describe('正常系', () => {
      it('有効なリクエストデータをバリデートできる', () => {
        // Given: 有効なリクエストデータ
        const data = createValidRequest()

        // When: バリデーションを実行
        const result = handler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual(data)
      })

      it('最小限のデータ（オプションフィールドなし）でも検証できる', () => {
        // Given: オプションフィールドなし
        const data = {}

        // When: バリデーションを実行
        const result = handler.validate(data)

        // Then: 正しいリクエストオブジェクトが返される
        expect(result).toEqual({})
      })
    })

    describe('異常系', () => {
      it('無効なdeviceTypeの場合、バリデーションエラーが発生する', () => {
        // Given: 無効なdeviceType
        const data = {
          deviceType: 'INVALID' as any,
        }

        // When/Then: バリデーションエラーが発生
        expect(() => handler.validate(data)).toThrow(ZodError)
      })

      it('無効なlocation形式の場合、バリデーションエラーが発生する', () => {
        // Given: 無効な位置情報
        const data = {
          location: {
            latitude: 'invalid' as any, // 数値であるべき
            longitude: faker.location.longitude(),
          },
        }

        // When/Then: バリデーションエラーが発生
        expect(() => handler.validate(data)).toThrow(ZodError)
      })
    })
  })

  describe('execute', () => {
    describe('正常系', () => {
      it('有効なリクエストでセッションを開始できる', async () => {
        // Given: 有効なリクエストとモックレスポンス
        const request = createValidRequest()
        const userId = testDataHelpers.userId()
        const mockDto = createMockSessionDto(userId)
        vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        const result = await handler.execute(request, userId)

        // Then: セッションDTOが返される
        expect(result).toBe(mockDto)
        expect(mockCommandHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
          })
        )
        expect(mockCommandHandler.handle).toHaveBeenCalledWith(
          expect.any(StartShoppingSessionCommand)
        )
      })

      it('最小限の情報でセッションを開始できる', async () => {
        // Given: オプションフィールドなしのリクエスト
        const request = {}
        const userId = testDataHelpers.userId()
        const mockDto = createMockSessionDto(userId)
        vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        const result = await handler.execute(request, userId)

        // Then: 正常に処理される
        expect(result).toBe(mockDto)
        expect(mockCommandHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
          })
        )
      })

      it('デバイスタイプと位置情報を含むリクエストを処理できる', async () => {
        // Given: 完全なリクエスト
        const request: StartShoppingSessionRequest = {
          deviceType: 'MOBILE',
          location: {
            latitude: faker.location.latitude(),
            longitude: faker.location.longitude(),
            name: faker.location.streetAddress(),
          },
        }
        const userId = testDataHelpers.userId()
        const mockDto = createMockSessionDto(userId)
        vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

        // When: ハンドラーを実行
        const result = await handler.execute(request, userId)

        // Then: 正常に処理される
        expect(result).toBe(mockDto)
        const actualCommand = vi.mocked(mockCommandHandler.handle).mock
          .calls[0][0] as StartShoppingSessionCommand
        expect(actualCommand.deviceType?.getValue()).toBe(request.deviceType)
        expect(actualCommand.location?.getLatitude()).toBe(request.location?.latitude)
        expect(actualCommand.location?.getLongitude()).toBe(request.location?.longitude)
        expect(actualCommand.location?.getName()).toBe(request.location?.name)
      })
    })

    describe('異常系', () => {
      it('既にアクティブなセッションがある場合、BusinessRuleExceptionがそのまま伝播する', async () => {
        // Given: アクティブセッション存在エラー
        const request = createValidRequest()
        const userId = testDataHelpers.userId()
        const error = new BusinessRuleException('既にアクティブなセッションが存在します')
        vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute(request, userId)).rejects.toThrow(error)
      })

      it('予期しないエラーが発生した場合、そのまま伝播する', async () => {
        // Given: 予期しないエラー
        const request = createValidRequest()
        const userId = testDataHelpers.userId()
        const error = new Error('Database connection failed')
        vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(error)

        // When/Then: 例外がそのまま伝播される
        await expect(handler.execute(request, userId)).rejects.toThrow(error)
      })
    })
  })

  describe('handle (統合)', () => {
    it('BaseApiHandlerの例外変換機能が正しく動作する', async () => {
      // Given: Zodバリデーションエラー
      const data = {
        deviceType: 'INVALID_TYPE' as any,
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
      // Given: BusinessRuleException
      const request = createValidRequest()
      const userId = testDataHelpers.userId()
      const error = new BusinessRuleException('既にアクティブなセッションが存在します')

      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(error)

      // When: handleメソッドを実行
      const resultPromise = handler.handle(request, userId)

      // Then: ApiBusinessRuleExceptionに変換される
      await expect(resultPromise).rejects.toThrow()
      await expect(resultPromise).rejects.toMatchObject({
        statusCode: 422,
        errorCode: 'BUSINESS_RULE_VIOLATION',
      })
    })

    it('正常系でDTOが返される', async () => {
      // Given: 正常なリクエスト
      const request = createValidRequest()
      const userId = testDataHelpers.userId()
      const mockDto = createMockSessionDto(userId)

      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // When: handleメソッドを実行
      const result = await handler.handle(request, userId)

      // Then: DTOが返される
      expect(result).toBe(mockDto)
    })
  })
})
