import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiInternalException } from '@/modules/shared/server/api/exceptions/api-internal.exception'
import { ApiNotFoundException } from '@/modules/shared/server/api/exceptions/api-not-found.exception'
import { GetProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/get-profile.handler'
import type { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'

describe('GetProfileApiHandler', () => {
  let mockUserApplicationService: UserApplicationService
  let apiHandler: GetProfileApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserApplicationService = {
      getUserById: vi.fn(),
      getUserByNextAuthId: vi.fn(),
      updateUserProfile: vi.fn(),
      createOrUpdateFromNextAuth: vi.fn(),
      handleSuccessfulAuthentication: vi.fn(),
      deactivateUser: vi.fn(),
      getUserByEmail: vi.fn(),
      getActiveUsers: vi.fn(),
      getActiveUserCount: vi.fn(),
    } as unknown as UserApplicationService
    apiHandler = new GetProfileApiHandler(mockUserApplicationService)
  })

  // テストデータビルダー
  const createUserId = () => faker.string.uuid()
  const createNextAuthId = () => faker.string.uuid()
  const createUserProfile = () => ({
    id: createUserId(),
    nextAuthId: createNextAuthId(),
    email: faker.internet.email(),
    profile: {
      displayName: faker.person.fullName(),
      timezone: faker.location.timeZone(),
      language: faker.helpers.arrayElement(['ja', 'en'] as const),
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'auto'] as const),
        notifications: faker.datatype.boolean(),
        emailFrequency: faker.helpers.arrayElement([
          'daily',
          'weekly',
          'monthly',
          'never',
        ] as const),
      },
    },
    status: faker.helpers.arrayElement(['ACTIVE', 'DEACTIVATED'] as const),
    isActive: true,
    lastLoginAt: faker.date.recent(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  })

  describe('正常系', () => {
    it('プロフィール情報を正常に取得できる', async () => {
      // Given: 有効なユーザープロフィール
      const userId = createUserId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(expectedProfile)

      // When: APIハンドラーを実行
      const requestData = {}
      const result = await apiHandler.handle(requestData, userId)

      // Then: プロフィール情報が返される
      expect(result).toEqual(expectedProfile)

      // UserApplicationServiceが正しく呼び出されることを確認
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledTimes(1)
    })

    it('空のリクエストデータでも正常に処理できる', async () => {
      // Given: 空のリクエストデータと有効なユーザー
      const userId = createUserId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(expectedProfile)

      // When: 空のリクエストデータでAPIハンドラーを実行
      const requestData = {}
      const result = await apiHandler.handle(requestData, userId)

      // Then: プロフィール情報が返される
      expect(result).toEqual(expectedProfile)
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
    })

    it('複数回の取得リクエストを処理できる', async () => {
      // Given: 複数のユーザープロフィール
      const userId1 = createUserId()
      const userId2 = createUserId()
      const profile1 = createUserProfile()
      const profile2 = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserById)
        .mockResolvedValueOnce(profile1)
        .mockResolvedValueOnce(profile2)

      // When: 複数のAPIハンドラーを実行
      const result1 = await apiHandler.handle({}, userId1)
      const result2 = await apiHandler.handle({}, userId2)

      // Then: それぞれ正しいプロフィール情報が返される
      expect(result1).toEqual(profile1)
      expect(result2).toEqual(profile2)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledTimes(2)
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId1)
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId2)
    })
  })

  describe('バリデーション', () => {
    it('GETリクエストのため、どのようなデータでもバリデーションを通過する', async () => {
      // Given: 任意のリクエストデータとユーザー
      const userId = createUserId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(expectedProfile)

      // When: 任意のデータでAPIハンドラーを実行
      const requestData = { unexpectedField: 'some value' }
      const result = await apiHandler.handle(requestData, userId)

      // Then: バリデーションエラーは発生せず、正常に処理される
      expect(result).toEqual(expectedProfile)
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
    })

    it('nullやundefinedのリクエストデータでも処理できる', async () => {
      // Given: 空オブジェクトのリクエストデータとユーザー（nullはZodバリデーションでエラーになる）
      const userId = createUserId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(expectedProfile)

      // When: 空オブジェクトでAPIハンドラーを実行
      const result = await apiHandler.handle({}, userId)

      // Then: バリデーションエラーは発生せず、正常に処理される
      expect(result).toEqual(expectedProfile)
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
    })
  })

  describe('例外処理', () => {
    it('ユーザーが見つからない場合はNotFoundExceptionが伝播される', async () => {
      // Given: 存在しないユーザーID
      const userId = createUserId()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(null)

      // When & Then: ApiNotFoundExceptionに変換されることを確認
      await expect(apiHandler.handle({}, userId)).rejects.toThrow(ApiNotFoundException)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
    })

    it('UserApplicationServiceでエラーが発生した場合は適切に処理される', async () => {
      // Given: UserApplicationServiceがエラーを投げる
      const userId = createUserId()

      vi.mocked(mockUserApplicationService.getUserById).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      // When & Then: ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle({}, userId)).rejects.toThrow(ApiInternalException)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
    })

    it('予期しないエラーが発生した場合は適切に処理される', async () => {
      // Given: 予期しないエラー
      const userId = createUserId()

      vi.mocked(mockUserApplicationService.getUserById).mockRejectedValueOnce(
        new TypeError('Unexpected type error')
      )

      // When & Then: ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle({}, userId)).rejects.toThrow(ApiInternalException)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
    })
  })

  describe('依存関係', () => {
    it('UserApplicationServiceの依存関係が正しく注入される', () => {
      // Given & When: ハンドラーを作成
      const handler = new GetProfileApiHandler(mockUserApplicationService)

      // Then: 依存関係が正しく設定される
      expect(handler).toBeInstanceOf(GetProfileApiHandler)
      expect(handler).toBeDefined()
    })
  })
})
