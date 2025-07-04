import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiInternalException } from '@/modules/shared/server/api/exceptions/api-internal.exception'
import { ApiNotFoundException } from '@/modules/shared/server/api/exceptions/api-not-found.exception'
import { UpdateProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/update-profile.handler'
import type { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'

describe('UpdateProfileApiHandler', () => {
  let mockUserApplicationService: UserApplicationService
  let apiHandler: UpdateProfileApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserApplicationService = {
      getUserById: vi.fn(),
      getUserByEmail: vi.fn(),
      updateUserProfile: vi.fn(),
      createOrUpdateFromNextAuth: vi.fn(),
      handleSuccessfulAuthentication: vi.fn(),
      deactivateUser: vi.fn(),
      getActiveUsers: vi.fn(),
      getActiveUserCount: vi.fn(),
    } as unknown as UserApplicationService
    apiHandler = new UpdateProfileApiHandler(mockUserApplicationService)
  })

  // テストデータビルダー
  const createUserId = () => faker.string.uuid()
  const createNextAuthId = () => faker.string.uuid()
  const createUserProfile = () => {
    const nextAuthId = createNextAuthId()
    return {
      id: createUserId(),
      userId: nextAuthId,
      nextAuthId: nextAuthId,
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
    }
  }

  const createValidUpdateRequest = () => ({
    displayName: faker.person.fullName(),
    timezone: faker.location.timeZone(),
    language: faker.helpers.arrayElement(['ja', 'en'] as const),
  })

  describe('正常系', () => {
    it('プロフィール更新が正常に実行される', async () => {
      // Given: 有効な更新リクエストとユーザー
      const userId = createNextAuthId()
      const updateRequest = createValidUpdateRequest()
      const currentUser = createUserProfile()
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          ...updateRequest,
        },
      }

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(currentUser)
      vi.mocked(mockUserApplicationService.updateUserProfile).mockResolvedValueOnce(updatedUser)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle(updateRequest, userId)

      // Then: 更新されたプロフィール情報が返される
      expect(result).toEqual(updatedUser)

      // UserApplicationServiceが正しく呼び出されることを確認
      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(currentUser.id, {
        displayName: updateRequest.displayName,
        timezone: updateRequest.timezone,
        language: updateRequest.language,
      })
    })

    it('日本語の表示名でプロフィール更新できる', async () => {
      // Given: 日本語の表示名を含む更新リクエスト
      const userId = createNextAuthId()
      const updateRequest = {
        displayName: '田中太郎',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }
      const currentUser = createUserProfile()
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          ...updateRequest,
        },
      }

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(currentUser)
      vi.mocked(mockUserApplicationService.updateUserProfile).mockResolvedValueOnce(updatedUser)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle(updateRequest, userId)

      // Then: 日本語表示名が正しく更新される
      expect(result).toEqual(updatedUser)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(currentUser.id, {
        displayName: '田中太郎',
        timezone: 'Asia/Tokyo',
        language: 'ja',
      })
    })

    it('英語の言語設定でプロフィール更新できる', async () => {
      // Given: 英語言語設定の更新リクエスト
      const userId = createNextAuthId()
      const updateRequest = {
        displayName: 'John Smith',
        timezone: 'America/New_York',
        language: 'en' as const,
      }
      const currentUser = createUserProfile()
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          ...updateRequest,
        },
      }

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(currentUser)
      vi.mocked(mockUserApplicationService.updateUserProfile).mockResolvedValueOnce(updatedUser)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle(updateRequest, userId)

      // Then: 英語設定が正しく更新される
      expect(result).toEqual(updatedUser)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(currentUser.id, {
        displayName: 'John Smith',
        timezone: 'America/New_York',
        language: 'en',
      })
    })
  })

  describe('バリデーション', () => {
    it('表示名が空文字の場合はバリデーションエラーを投げる', async () => {
      const invalidRequest = {
        displayName: '',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle(invalidRequest, createNextAuthId())).rejects.toThrow()

      // UserApplicationServiceが呼び出されないことを確認
      expect(mockUserApplicationService.getUserById).not.toHaveBeenCalled()
      expect(mockUserApplicationService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('表示名が100文字を超える場合はバリデーションエラーを投げる', async () => {
      const invalidRequest = {
        displayName: 'a'.repeat(101), // 101文字
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle(invalidRequest, createNextAuthId())).rejects.toThrow()

      // UserApplicationServiceが呼び出されないことを確認
      expect(mockUserApplicationService.getUserById).not.toHaveBeenCalled()
      expect(mockUserApplicationService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('タイムゾーンが空文字の場合はバリデーションエラーを投げる', async () => {
      const invalidRequest = {
        displayName: 'Test User',
        timezone: '',
        language: 'ja' as const,
      }

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle(invalidRequest, createNextAuthId())).rejects.toThrow()

      // UserApplicationServiceが呼び出されないことを確認
      expect(mockUserApplicationService.getUserById).not.toHaveBeenCalled()
      expect(mockUserApplicationService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('言語が無効な値の場合はバリデーションエラーを投げる', async () => {
      const invalidRequest = {
        displayName: 'Test User',
        timezone: 'Asia/Tokyo',
        language: 'fr' as any, // サポートされていない言語
      }

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle(invalidRequest, createNextAuthId())).rejects.toThrow()

      // UserApplicationServiceが呼び出されないことを確認
      expect(mockUserApplicationService.getUserById).not.toHaveBeenCalled()
      expect(mockUserApplicationService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('必須フィールドが不足している場合はバリデーションエラーを投げる', async () => {
      const invalidRequest = {
        displayName: 'Test User',
        // timezone と language が不足
      }

      // BaseApiHandlerは例外を投げるのでexpect.rejectsでテスト
      await expect(apiHandler.handle(invalidRequest, createNextAuthId())).rejects.toThrow()

      // UserApplicationServiceが呼び出されないことを確認
      expect(mockUserApplicationService.getUserById).not.toHaveBeenCalled()
      expect(mockUserApplicationService.updateUserProfile).not.toHaveBeenCalled()
    })
  })

  describe('例外処理', () => {
    it('ユーザーが見つからない場合はNotFoundExceptionが伝播される', async () => {
      // Given: 存在しないユーザーID
      const userId = createNextAuthId()
      const updateRequest = createValidUpdateRequest()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(null)

      // When & Then: ApiNotFoundExceptionに変換されることを確認
      await expect(apiHandler.handle(updateRequest, userId)).rejects.toThrow(ApiNotFoundException)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
      expect(mockUserApplicationService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('プロフィール更新でエラーが発生した場合は適切に処理される', async () => {
      // Given: 更新処理でエラーが発生する
      const userId = createNextAuthId()
      const updateRequest = createValidUpdateRequest()
      const currentUser = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(currentUser)
      vi.mocked(mockUserApplicationService.updateUserProfile).mockRejectedValueOnce(
        new Error('Database update failed')
      )

      // When & Then: ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle(updateRequest, userId)).rejects.toThrow(ApiInternalException)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(currentUser.id, {
        displayName: updateRequest.displayName,
        timezone: updateRequest.timezone,
        language: updateRequest.language,
      })
    })

    it('ユーザー取得でエラーが発生した場合は適切に処理される', async () => {
      // Given: ユーザー取得でエラーが発生する
      const userId = createNextAuthId()
      const updateRequest = createValidUpdateRequest()

      vi.mocked(mockUserApplicationService.getUserById).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      // When & Then: ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle(updateRequest, userId)).rejects.toThrow(ApiInternalException)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
      expect(mockUserApplicationService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('予期しないエラーが発生した場合は適切に処理される', async () => {
      // Given: 予期しないエラー
      const userId = createNextAuthId()
      const updateRequest = createValidUpdateRequest()
      const currentUser = createUserProfile()

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(currentUser)
      vi.mocked(mockUserApplicationService.updateUserProfile).mockRejectedValueOnce(
        new TypeError('Unexpected type error')
      )

      // When & Then: ApiInternalExceptionに変換されることを確認
      await expect(apiHandler.handle(updateRequest, userId)).rejects.toThrow(ApiInternalException)

      expect(mockUserApplicationService.getUserById).toHaveBeenCalledWith(userId)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(currentUser.id, {
        displayName: updateRequest.displayName,
        timezone: updateRequest.timezone,
        language: updateRequest.language,
      })
    })
  })

  describe('依存関係', () => {
    it('UserApplicationServiceの依存関係が正しく注入される', () => {
      // Given & When: ハンドラーを作成
      const handler = new UpdateProfileApiHandler(mockUserApplicationService)

      // Then: 依存関係が正しく設定される
      expect(handler).toBeInstanceOf(UpdateProfileApiHandler)
      expect(handler).toBeDefined()
    })
  })

  describe('エッジケース', () => {
    it('表示名が1文字の場合も正常に処理される', async () => {
      // Given: 1文字の表示名
      const userId = createNextAuthId()
      const updateRequest = {
        displayName: 'A',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }
      const currentUser = createUserProfile()
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          ...updateRequest,
        },
      }

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(currentUser)
      vi.mocked(mockUserApplicationService.updateUserProfile).mockResolvedValueOnce(updatedUser)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle(updateRequest, userId)

      // Then: 正常に更新される
      expect(result).toEqual(updatedUser)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(
        currentUser.id,
        updateRequest
      )
    })

    it('表示名が100文字ちょうどの場合は正常に処理される', async () => {
      // Given: 100文字の表示名
      const userId = createNextAuthId()
      const updateRequest = {
        displayName: 'a'.repeat(100), // ちょうど100文字
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }
      const currentUser = createUserProfile()
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          ...updateRequest,
        },
      }

      vi.mocked(mockUserApplicationService.getUserById).mockResolvedValueOnce(currentUser)
      vi.mocked(mockUserApplicationService.updateUserProfile).mockResolvedValueOnce(updatedUser)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle(updateRequest, userId)

      // Then: 正常に更新される
      expect(result).toEqual(updatedUser)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(
        currentUser.id,
        updateRequest
      )
    })
  })
})
