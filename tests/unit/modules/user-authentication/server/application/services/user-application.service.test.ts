import { describe, it, expect, beforeEach, vi } from 'vitest'

// テスト対象のUserApplicationService
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'

import { NextAuthUserBuilder } from '../../../../../../__fixtures__/builders'
import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

// モックサービス
const mockUserIntegrationService = {
  createOrUpdateFromNextAuth: vi.fn(),
  handleSuccessfulAuthentication: vi.fn(),
  updateUserProfile: vi.fn(),
  deactivateUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  findUserByNextAuthId: vi.fn(),
  getActiveUsers: vi.fn(),
  getActiveUserCount: vi.fn(),
}

describe('UserApplicationService', () => {
  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks()
  })

  describe('NextAuth統合機能', () => {
    it('NextAuthユーザーからドメインユーザーを作成できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const createdUser = User.createFromNextAuth(nextAuthUser)

      mockUserIntegrationService.createOrUpdateFromNextAuth.mockResolvedValue(createdUser)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.createOrUpdateFromNextAuth(nextAuthUser)

      // Assert（検証）
      expect(result.nextAuthId).toBe(nextAuthUser.id)
      expect(result.email).toBe(nextAuthUser.email)
      expect(result.status).toBe('ACTIVE')
      expect(mockUserIntegrationService.createOrUpdateFromNextAuth).toHaveBeenCalledWith(
        nextAuthUser
      )
    })

    it('認証成功時にログインを記録できる', async () => {
      // Arrange（準備）
      const nextAuthId = 'test-next-auth-id'
      const user = User.createFromNextAuth(new NextAuthUserBuilder().withId(nextAuthId).build())
      user.recordLogin()

      mockUserIntegrationService.handleSuccessfulAuthentication.mockResolvedValue(user)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.handleSuccessfulAuthentication(nextAuthId)

      // Assert（検証）
      expect(result.nextAuthId).toBe(nextAuthId)
      expect(result.lastLoginAt).not.toBeNull()
      expect(mockUserIntegrationService.handleSuccessfulAuthentication).toHaveBeenCalledWith(
        nextAuthId
      )
    })
  })

  describe('ユーザープロフィール管理', () => {
    it('ユーザープロフィールを更新できる', async () => {
      // Arrange（準備）
      const userId = new UserId(testDataHelpers.userId())
      const originalUser = new User({
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new Email('test@example.com'),
        profile: UserProfile.createDefault('元の名前'),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      const newProfile = new UserProfile({
        displayName: '新しい名前',
        timezone: 'America/New_York',
        language: 'en',
        preferences: originalUser.getProfile().getPreferences(),
      })

      const updatedUser = new User({
        id: originalUser.getId(),
        nextAuthId: originalUser.getNextAuthId(),
        email: originalUser.getEmail(),
        profile: newProfile,
        status: originalUser.getStatus(),
        createdAt: originalUser.getCreatedAt(),
        updatedAt: new Date(),
        lastLoginAt: originalUser.getLastLoginAt(),
      })

      mockUserIntegrationService.findUserById.mockResolvedValue(originalUser)
      mockUserIntegrationService.updateUserProfile.mockResolvedValue(updatedUser)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.updateUserProfile(userId.getValue(), {
        displayName: '新しい名前',
        timezone: 'America/New_York',
        language: 'en',
      })

      // Assert（検証）
      expect(result.profile.displayName).toBe('新しい名前')
      expect(result.profile.language).toBe('en')
      expect(mockUserIntegrationService.updateUserProfile).toHaveBeenCalledWith(userId, newProfile)
    })

    it('無効なプロフィール更新データはエラーとなる', async () => {
      // Arrange（準備）
      const userId = testDataHelpers.userId()

      // Act & Assert（実行 & 検証）
      const service = new UserApplicationService(mockUserIntegrationService as any)

      await expect(
        service.updateUserProfile(userId, {
          displayName: '', // 空文字は無効
          timezone: 'America/New_York',
          language: 'en',
        })
      ).rejects.toThrow('表示名は必須です')
    })

    it('サポートされていない言語はエラーとなる', async () => {
      // Arrange（準備）
      const userId = testDataHelpers.userId()

      // Act & Assert（実行 & 検証）
      const service = new UserApplicationService(mockUserIntegrationService as any)

      await expect(
        service.updateUserProfile(userId, {
          displayName: '有効な名前',
          timezone: 'America/New_York',
          language: 'fr' as any, // サポートされていない言語
        })
      ).rejects.toThrow('サポートされていない言語です')
    })
  })

  describe('ユーザー管理機能', () => {
    it('ユーザーを無効化できる', async () => {
      // Arrange（準備）
      const userId = new UserId(testDataHelpers.userId())
      const deactivatedUser = new User({
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new Email('test@example.com'),
        profile: UserProfile.createDefault('テストユーザー'),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      mockUserIntegrationService.deactivateUser.mockResolvedValue(deactivatedUser)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.deactivateUser(userId.getValue())

      // Assert（検証）
      expect(result.status).toBe('DEACTIVATED')
      expect(result.isActive).toBe(false)
      expect(mockUserIntegrationService.deactivateUser).toHaveBeenCalledWith(
        userId,
        'USER_REQUEST',
        userId.getValue()
      )
    })

    it('IDでユーザーを取得できる', async () => {
      // Arrange（準備）
      const userId = new UserId(testDataHelpers.userId())
      const user = User.createFromNextAuth(new NextAuthUserBuilder().withTestUser().build())

      mockUserIntegrationService.findUserById.mockResolvedValue(user)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.getUserById(userId.getValue())

      // Assert（検証）
      expect(result).toBeDefined()
      expect(result!.id).toBe(user.getId().getValue())
      expect(mockUserIntegrationService.findUserById).toHaveBeenCalledWith(userId)
    })

    it('メールアドレスでユーザーを取得できる', async () => {
      // Arrange（準備）
      const email = new Email('test@example.com')
      const user = User.createFromNextAuth(
        new NextAuthUserBuilder().withEmail(email.getValue()).build()
      )

      mockUserIntegrationService.findUserByEmail.mockResolvedValue(user)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.getUserByEmail(email.getValue())

      // Assert（検証）
      expect(result).toBeDefined()
      expect(result!.email).toBe(email.getValue())
      expect(mockUserIntegrationService.findUserByEmail).toHaveBeenCalledWith(email)
    })

    it('存在しないユーザーの取得はnullを返す', async () => {
      // Arrange（準備）
      const userId = new UserId(testDataHelpers.userId())
      const email = new Email('nonexistent@example.com')

      mockUserIntegrationService.findUserById.mockResolvedValue(null)
      mockUserIntegrationService.findUserByEmail.mockResolvedValue(null)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const userById = await service.getUserById(userId.getValue())
      const userByEmail = await service.getUserByEmail(email.getValue())

      // Assert（検証）
      expect(userById).toBeNull()
      expect(userByEmail).toBeNull()
    })
  })

  describe('ユーザーリスト取得機能', () => {
    it('アクティブユーザーのリストを取得できる', async () => {
      // Arrange（準備）
      const users = [
        User.createFromNextAuth(
          new NextAuthUserBuilder()
            .withId(testDataHelpers.userId())
            .withEmail('user1@example.com')
            .build()
        ),
        User.createFromNextAuth(
          new NextAuthUserBuilder()
            .withId(testDataHelpers.userId())
            .withEmail('user2@example.com')
            .build()
        ),
      ]

      mockUserIntegrationService.getActiveUsers.mockResolvedValue(users)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.getActiveUsers(10, 0)

      // Assert（検証）
      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('user1@example.com')
      expect(result[1].email).toBe('user2@example.com')
      expect(mockUserIntegrationService.getActiveUsers).toHaveBeenCalledWith(10, 0)
    })

    it('期間内のアクティブユーザー数を取得できる', async () => {
      // Arrange（準備）
      const count = 15

      mockUserIntegrationService.getActiveUserCount.mockResolvedValue(count)

      // Act（実行）
      const service = new UserApplicationService(mockUserIntegrationService as any)
      const result = await service.getActiveUserCount(7)

      // Assert（検証）
      expect(result).toBe(15)
      expect(mockUserIntegrationService.getActiveUserCount).toHaveBeenCalledWith(7)
    })
  })
})
