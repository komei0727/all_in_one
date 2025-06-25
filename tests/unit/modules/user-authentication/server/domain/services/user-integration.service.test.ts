import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  UserIdBuilder,
  EmailBuilder,
  UserProfileBuilder,
  UserStatusBuilder,
  NextAuthUserBuilder,
} from '../../../../../../__fixtures__/builders'

// テスト対象のUserIntegrationService
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'

// 依存関係
import { UserRepository } from '@/modules/user-authentication/server/domain/repositories/user.repository'
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'

// モックリポジトリ
const mockUserRepository = {
  findById: vi.fn(),
  findByNextAuthId: vi.fn(),
  findByEmail: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  findActiveUsers: vi.fn(),
  existsByNextAuthId: vi.fn(),
  existsByEmail: vi.fn(),
  countActiveUsersInPeriod: vi.fn(),
}

describe('UserIntegrationService', () => {
  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks()
  })

  describe('NextAuthユーザーからドメインユーザーの作成', () => {
    it('新規NextAuthユーザーからドメインユーザーを作成できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()

      // 既存ユーザーが存在しないことをモック
      mockUserRepository.findByNextAuthId.mockResolvedValue(null)
      mockUserRepository.existsByEmail.mockResolvedValue(false)

      // 保存処理をモック
      const savedUser = User.createFromNextAuth(nextAuthUser)
      mockUserRepository.save.mockResolvedValue(savedUser)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.createOrUpdateFromNextAuth(nextAuthUser)

      // Assert（検証）
      expect(result.getNextAuthId()).toBe(nextAuthUser.id)
      expect(result.getEmail().getValue()).toBe(nextAuthUser.email)
      expect(result.isActive()).toBe(true)
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1)
    })

    it('既存ドメインユーザーが存在する場合は同期して返す', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withId('existing-user')
        .withEmail('updated@example.com')
        .build()

      const existingUser = new User({
        id: new UserId('user-123'),
        nextAuthId: 'existing-user',
        email: new Email('old@example.com'),
        profile: UserProfile.createDefault('既存ユーザー'),
        status: UserStatus.createActive(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: null,
      })

      // 既存ユーザーが見つかることをモック
      mockUserRepository.findByNextAuthId.mockResolvedValue(existingUser)

      // 更新後のユーザーをモック
      mockUserRepository.save.mockResolvedValue(existingUser)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.createOrUpdateFromNextAuth(nextAuthUser)

      // Assert（検証）
      expect(result.getNextAuthId()).toBe('existing-user')
      expect(mockUserRepository.findByNextAuthId).toHaveBeenCalledWith('existing-user')
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1)
    })

    it('メールアドレスの重複がある場合はエラーが発生する', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withId('new-user')
        .withEmail('duplicate@example.com')
        .build()

      // 新規ユーザーだが、メールアドレスが重複
      mockUserRepository.findByNextAuthId.mockResolvedValue(null)
      mockUserRepository.existsByEmail.mockResolvedValue(true)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.createOrUpdateFromNextAuth(nextAuthUser)).rejects.toThrow(
        'メールアドレスが既に使用されています'
      )
    })
  })

  describe('ユーザー認証時の処理', () => {
    it('認証成功時にログインを記録できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const existingUser = User.createFromNextAuth(nextAuthUser)

      mockUserRepository.findByNextAuthId.mockResolvedValue(existingUser)
      mockUserRepository.save.mockResolvedValue(existingUser)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.handleSuccessfulAuthentication(nextAuthUser.id)

      // Assert（検証）
      expect(result.getLastLoginAt()).not.toBeNull()
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1)
    })

    it('無効化されたユーザーの認証はエラーが発生する', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const deactivatedUser = new User({
        id: new UserId('user-123'),
        nextAuthId: nextAuthUser.id,
        email: new Email(nextAuthUser.email),
        profile: UserProfile.createDefault('無効ユーザー'),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      mockUserRepository.findByNextAuthId.mockResolvedValue(deactivatedUser)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.handleSuccessfulAuthentication(nextAuthUser.id)).rejects.toThrow(
        'アカウントが無効化されています'
      )
    })

    it('存在しないユーザーの認証はエラーが発生する', async () => {
      // Arrange（準備）
      const nonExistentNextAuthId = 'non-existent-user'

      mockUserRepository.findByNextAuthId.mockResolvedValue(null)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.handleSuccessfulAuthentication(nonExistentNextAuthId)).rejects.toThrow(
        'ユーザーが見つかりません'
      )
    })
  })

  describe('プロフィール更新との統合', () => {
    it('ユーザープロフィールを更新できる', async () => {
      // Arrange（準備）
      const userId = new UserId('user-123')
      const existingUser = new User({
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
        preferences: existingUser.getProfile().getPreferences(),
      })

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.save.mockResolvedValue(existingUser)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.updateUserProfile(userId, newProfile)

      // Assert（検証）
      expect(result.getProfile().getDisplayName()).toBe('新しい名前')
      expect(result.getProfile().getLanguage()).toBe('en')
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1)
    })

    it('存在しないユーザーのプロフィール更新はエラーが発生する', async () => {
      // Arrange（準備）
      const userId = new UserId('non-existent-user')
      const newProfile = UserProfile.createDefault('新しい名前')

      mockUserRepository.findById.mockResolvedValue(null)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.updateUserProfile(userId, newProfile)).rejects.toThrow(
        'ユーザーが見つかりません'
      )
    })

    it('無効化されたユーザーのプロフィール更新はエラーが発生する', async () => {
      // Arrange（準備）
      const userId = new UserId('user-123')
      const deactivatedUser = new User({
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new Email('test@example.com'),
        profile: UserProfile.createDefault('無効ユーザー'),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      const newProfile = UserProfile.createDefault('新しい名前')

      mockUserRepository.findById.mockResolvedValue(deactivatedUser)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.updateUserProfile(userId, newProfile)).rejects.toThrow(
        '無効化されたユーザーのプロフィールは更新できません'
      )
    })
  })

  describe('ユーザー無効化', () => {
    it('ユーザーを無効化できる', async () => {
      // Arrange（準備）
      const userId = new UserId('user-123')
      const activeUser = new User({
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new Email('test@example.com'),
        profile: UserProfile.createDefault('アクティブユーザー'),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      mockUserRepository.findById.mockResolvedValue(activeUser)
      mockUserRepository.save.mockResolvedValue(activeUser)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.deactivateUser(userId)

      // Assert（検証）
      expect(result.isActive()).toBe(false)
      expect(result.canLogin()).toBe(false)
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1)
    })

    it('存在しないユーザーの無効化はエラーが発生する', async () => {
      // Arrange（準備）
      const userId = new UserId('non-existent-user')

      mockUserRepository.findById.mockResolvedValue(null)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.deactivateUser(userId)).rejects.toThrow('ユーザーが見つかりません')
    })

    it('既に無効化されたユーザーの再無効化はエラーが発生する', async () => {
      // Arrange（準備）
      const userId = new UserId('user-123')
      const deactivatedUser = new User({
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new Email('test@example.com'),
        profile: UserProfile.createDefault('無効ユーザー'),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      mockUserRepository.findById.mockResolvedValue(deactivatedUser)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.deactivateUser(userId)).rejects.toThrow('既に無効化されたユーザーです')
    })
  })

  describe('アクティブユーザー管理', () => {
    it('アクティブなユーザー一覧を取得できる', async () => {
      // Arrange（準備）
      const activeUsers = [
        new User({
          id: new UserId('user-1'),
          nextAuthId: 'next-auth-1',
          email: new Email('user1@example.com'),
          profile: UserProfile.createDefault('ユーザー1'),
          status: UserStatus.createActive(),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        }),
        new User({
          id: new UserId('user-2'),
          nextAuthId: 'next-auth-2',
          email: new Email('user2@example.com'),
          profile: UserProfile.createDefault('ユーザー2'),
          status: UserStatus.createActive(),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        }),
      ]

      mockUserRepository.findActiveUsers.mockResolvedValue(activeUsers)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.getActiveUsers(50, 0)

      // Assert（検証）
      expect(result).toHaveLength(2)
      expect(result[0].isActive()).toBe(true)
      expect(result[1].isActive()).toBe(true)
      expect(mockUserRepository.findActiveUsers).toHaveBeenCalledWith(50, 0)
    })

    it('デフォルトのlimitとoffsetでアクティブユーザーを取得できる', async () => {
      // Arrange（準備）
      mockUserRepository.findActiveUsers.mockResolvedValue([])

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await service.getActiveUsers()

      // Assert（検証）
      expect(mockUserRepository.findActiveUsers).toHaveBeenCalledWith(100, 0)
    })

    it('指定期間内のアクティブユーザー数を取得できる', async () => {
      // Arrange（準備）
      const activeUserCount = 42
      mockUserRepository.countActiveUsersInPeriod.mockResolvedValue(activeUserCount)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.getActiveUserCount(30)

      // Assert（検証）
      expect(result).toBe(42)
      expect(mockUserRepository.countActiveUsersInPeriod).toHaveBeenCalledWith(30)
    })

    it('0日の期間でアクティブユーザー数を取得できる', async () => {
      // Arrange（準備）
      mockUserRepository.countActiveUsersInPeriod.mockResolvedValue(0)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.getActiveUserCount(0)

      // Assert（検証）
      expect(result).toBe(0)
      expect(mockUserRepository.countActiveUsersInPeriod).toHaveBeenCalledWith(0)
    })
  })
})
