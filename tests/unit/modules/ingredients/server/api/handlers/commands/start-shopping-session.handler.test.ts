import { faker } from '@faker-js/faker'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { StartShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler'
import type { StartShoppingSessionRequest } from '@/modules/ingredients/server/api/validators/start-shopping-session.validator'
import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'
import type { StartShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/start-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  BusinessRuleException,
  ValidationException,
} from '@/modules/ingredients/server/domain/exceptions'

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
    userId: faker.string.uuid(),
    deviceType: faker.helpers.arrayElement(['MOBILE', 'TABLET', 'DESKTOP']),
    location: faker.helpers.maybe(() => ({
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      address: faker.location.streetAddress(),
    })),
  })

  const createMockSessionDto = () =>
    new ShoppingSessionDto(
      faker.string.uuid(),
      faker.string.uuid(),
      'ACTIVE',
      faker.date.recent().toISOString(),
      null,
      faker.helpers.arrayElement(['MOBILE', 'WEB']),
      faker.helpers.maybe(() => ({
        placeName: faker.location.streetAddress(),
      })) ?? null,
      []
    )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('有効なリクエストでセッションを開始できる', async () => {
      // Given: 有効なリクエストとモックレスポンス
      const request = createValidRequest()
      const mockDto = createMockSessionDto()
      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // When: ハンドラーを実行
      const result = await handler.handle(request)

      // Then: 適切なコマンドが作成され、結果が返される
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: request.userId,
        })
      )
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.any(StartShoppingSessionCommand)
      )
      expect(result).toEqual({
        sessionId: mockDto.sessionId,
        userId: mockDto.userId,
        status: mockDto.status,
        startedAt: mockDto.startedAt,
        completedAt: mockDto.completedAt,
        deviceType: mockDto.deviceType,
        location: mockDto.location,
      })
    })

    it('最小限の必須項目のみでセッションを開始できる', async () => {
      // Given: userIdのみのリクエスト
      const request = { userId: faker.string.uuid() }
      const mockDto = createMockSessionDto()
      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // When: ハンドラーを実行
      const result = await handler.handle(request)

      // Then: 正常に処理される
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: request.userId,
        })
      )
      expect(result).toBeDefined()
    })
  })

  describe('異常系', () => {
    it('userIdが不足している場合はバリデーションエラーをスローする', async () => {
      // Given: userIdのない不正なリクエスト
      const request = {} as StartShoppingSessionRequest

      // When & Then: ValidationExceptionがスローされる
      await expect(handler.handle(request)).rejects.toThrow(ValidationException)
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('userIdが空文字の場合はバリデーションエラーをスローする', async () => {
      // Given: 空のuserIdを持つリクエスト
      const request = { userId: '' }

      // When & Then: ValidationExceptionがスローされる
      await expect(handler.handle(request)).rejects.toThrow(ValidationException)
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('無効なdeviceTypeの場合はバリデーションエラーをスローする', async () => {
      // Given: 無効なdeviceTypeを持つリクエスト
      const request = {
        userId: faker.string.uuid(),
        deviceType: 'INVALID' as any,
      }

      // When & Then: ValidationExceptionがスローされる
      await expect(handler.handle(request)).rejects.toThrow(ValidationException)
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })

    it('既にアクティブなセッションがある場合はビジネスルール例外をスローする', async () => {
      // Given: アクティブセッション存在エラー
      const request = createValidRequest()
      const error = new BusinessRuleException('既にアクティブなセッションが存在します')
      vi.mocked(mockCommandHandler.handle).mockRejectedValueOnce(error)

      // When & Then: BusinessRuleExceptionがそのまま伝播される
      await expect(handler.handle(request)).rejects.toThrow(BusinessRuleException)
    })

    it('無効なlocation形式の場合はバリデーションエラーをスローする', async () => {
      // Given: 無効な位置情報を持つリクエスト
      const request = {
        userId: faker.string.uuid(),
        location: {
          latitude: 'invalid' as any, // 数値であるべき
          longitude: faker.location.longitude(),
        },
      }

      // When & Then: ValidationExceptionがスローされる
      await expect(handler.handle(request)).rejects.toThrow(ValidationException)
      expect(mockCommandHandler.handle).not.toHaveBeenCalled()
    })
  })

  describe('レスポンス形式', () => {
    it('DTOをJSON形式に変換して返す', async () => {
      // Given: 完全なDTOレスポンス
      const request = createValidRequest()
      const mockDto = createMockSessionDto()
      vi.mocked(mockCommandHandler.handle).mockResolvedValueOnce(mockDto)

      // When: ハンドラーを実行
      const result = await handler.handle(request)

      // Then: 適切なJSON形式で返される
      expect(result).toMatchObject({
        sessionId: expect.any(String),
        userId: expect.any(String),
        status: expect.any(String),
        startedAt: expect.any(String),
        completedAt: null,
        deviceType: expect.stringMatching(/^(MOBILE|WEB)$/),
      })
    })
  })
})
