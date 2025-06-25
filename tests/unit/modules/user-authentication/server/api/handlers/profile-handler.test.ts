import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ZodError } from 'zod'

import { ProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/profile-handler'
import { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'
import { NextAuthUserBuilder } from '../../../../../../__fixtures__/builders'
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'

// モックサービス
const mockUserApplicationService = {
  getUserByNextAuthId: vi.fn(),
  updateUserProfile: vi.fn(),
}

describe('ProfileApiHandler', () => {
  let handler: ProfileApiHandler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new ProfileApiHandler(mockUserApplicationService as unknown as UserApplicationService)
  })

  describe('getProfile', () => {
    it('正常にプロフィールを取得できる', async () => {
      // Arrange
      const nextAuthId = 'test-next-auth-id'
      const mockUser = {
        id: 'user-123',
        nextAuthId,
        email: 'test@example.com',
        profile: {
          displayName: 'テストユーザー',
          timezone: 'Asia/Tokyo',
          language: 'ja',
        },
      }

      mockUserApplicationService.getUserByNextAuthId.mockResolvedValue(mockUser)

      // Act
      const result = await handler.getProfile(nextAuthId)

      // Assert
      expect(result).toEqual(mockUser)
      expect(mockUserApplicationService.getUserByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })

    it('ユーザーが見つからない場合はエラーを投げる', async () => {
      // Arrange
      const nextAuthId = 'non-existent-id'
      mockUserApplicationService.getUserByNextAuthId.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.getProfile(nextAuthId)).rejects.toThrow('ユーザーが見つかりません')
    })
  })

  describe('updateProfile', () => {
    it('正常にプロフィールを更新できる', async () => {
      // Arrange
      const nextAuthId = 'test-next-auth-id'
      const updateRequest = {
        displayName: '新しい名前',
        timezone: 'America/New_York',
        language: 'en' as const,
      }

      const currentUser = {
        id: 'user-123',
        nextAuthId,
        email: 'test@example.com',
      }

      const updatedUser = {
        ...currentUser,
        profile: {
          displayName: updateRequest.displayName,
          timezone: updateRequest.timezone,
          language: updateRequest.language,
        },
      }

      mockUserApplicationService.getUserByNextAuthId.mockResolvedValue(currentUser)
      mockUserApplicationService.updateUserProfile.mockResolvedValue(updatedUser)

      // Act
      const result = await handler.updateProfile(nextAuthId, updateRequest)

      // Assert
      expect(result).toEqual(updatedUser)
      expect(mockUserApplicationService.updateUserProfile).toHaveBeenCalledWith(
        currentUser.id,
        updateRequest
      )
    })

    it('無効なリクエストデータの場合はバリデーションエラーを投げる', async () => {
      // Arrange
      const nextAuthId = 'test-next-auth-id'
      const invalidRequest = {
        displayName: '', // 空文字は無効
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // Act & Assert
      await expect(handler.updateProfile(nextAuthId, invalidRequest)).rejects.toThrow(ZodError)
    })

    it('サポートされていない言語の場合はバリデーションエラーを投げる', async () => {
      // Arrange
      const nextAuthId = 'test-next-auth-id'
      const invalidRequest = {
        displayName: '有効な名前',
        timezone: 'Asia/Tokyo',
        language: 'fr' as any, // サポートされていない言語
      }

      // Act & Assert
      await expect(handler.updateProfile(nextAuthId, invalidRequest)).rejects.toThrow(ZodError)
    })

    it('ユーザーが見つからない場合はエラーを投げる', async () => {
      // Arrange
      const nextAuthId = 'non-existent-id'
      const updateRequest = {
        displayName: '新しい名前',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      mockUserApplicationService.getUserByNextAuthId.mockResolvedValue(null)

      // Act & Assert
      await expect(handler.updateProfile(nextAuthId, updateRequest)).rejects.toThrow(
        'ユーザーが見つかりません'
      )
    })
  })
})
