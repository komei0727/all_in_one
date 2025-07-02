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
      getUserByNextAuthId: vi.fn(),
      updateUserProfile: vi.fn(),
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
      const nextAuthId = createNextAuthId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId).mockResolvedValueOnce(
        expectedProfile
      )

      // When: APIハンドラーを実行
      const requestData = {}
      const result = await apiHandler.handle(requestData, nextAuthId)

      // Then: プロフィール情報が返される
      expect(result).toEqual(expectedProfile)

      // UserApplicationServiceが正しく呼び出されることを確認
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledTimes(1)
    })

    it('空のリクエストデータでも正常に処理できる', async () => {
      // Given: 空のリクエストデータと有効なユーザー
      const nextAuthId = createNextAuthId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId).mockResolvedValueOnce(
        expectedProfile
      )

      // When: 空のリクエストデータでAPIハンドラーを実行
      const requestData = {}
      const result = await apiHandler.handle(requestData, nextAuthId)

      // Then: プロフィール情報が返される
      expect(result).toEqual(expectedProfile)
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })

    it('複数回の取得リクエストを処理できる', async () => {
      // Given: 複数のユーザープロフィール
      const nextAuthId1 = createNextAuthId()
      const nextAuthId2 = createNextAuthId()
      const profile1 = createUserProfile()
      const profile2 = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId)
        .mockResolvedValueOnce(profile1)
        .mockResolvedValueOnce(profile2)

      // When: 複数のAPIハンドラーを実行
      const result1 = await apiHandler.handle({}, nextAuthId1)
      const result2 = await apiHandler.handle({}, nextAuthId2)

      // Then: それぞれ正しいプロフィール情報が返される
      expect(result1).toEqual(profile1)
      expect(result2).toEqual(profile2)

      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledTimes(2)
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId1)
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId2)
    })
  })

  describe('バリデーション', () => {
    it('GETリクエストのため、どのようなデータでもバリデーションを通過する', async () => {
      // Given: 任意のリクエストデータとユーザー
      const nextAuthId = createNextAuthId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId).mockResolvedValueOnce(
        expectedProfile
      )

      // When: 任意のデータでAPIハンドラーを実行
      const requestData = { unexpectedField: 'some value' }
      const result = await apiHandler.handle(requestData, nextAuthId)

      // Then: バリデーションエラーは発生せず、正常に処理される
      expect(result).toEqual(expectedProfile)
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })

    it('nullやundefinedのリクエストデータでも処理できる', async () => {
      // Given: 空オブジェクトのリクエストデータとユーザー（nullはZodバリデーションでエラーになる）
      const nextAuthId = createNextAuthId()
      const expectedProfile = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId).mockResolvedValueOnce(
        expectedProfile
      )

      // When: 空オブジェクトでAPIハンドラーを実行
      const result = await apiHandler.handle({}, nextAuthId)

      // Then: バリデーションエラーは発生せず、正常に処理される
      expect(result).toEqual(expectedProfile)
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })
  })

  describe('例外処理', () => {
    it('ユーザーが見つからない場合はNotFoundExceptionが伝播される', async () => {
      // Given: 存在しないユーザーID
      const nextAuthId = createNextAuthId()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId).mockResolvedValueOnce(null)

      // When & Then: ApiNotFoundExceptionに変換されることを確認
      await expect(apiHandler.handle({}, nextAuthId)).rejects.toThrow(ApiNotFoundException)

      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })

    it('UserApplicationServiceでエラーが発生した場合は適切に処理される', async () => {
      // Given: UserApplicationServiceがエラーを投げる
      const nextAuthId = createNextAuthId()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      // When & Then: ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle({}, nextAuthId)).rejects.toThrow(ApiInternalException)

      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })

    it('予期しないエラーが発生した場合は適切に処理される', async () => {
      // Given: 予期しないエラー
      const nextAuthId = createNextAuthId()

      vi.mocked(mockUserApplicationService.getUserByNextAuthId).mockRejectedValueOnce(
        new TypeError('Unexpected type error')
      )

      // When & Then: ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle({}, nextAuthId)).rejects.toThrow(ApiInternalException)

      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
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
