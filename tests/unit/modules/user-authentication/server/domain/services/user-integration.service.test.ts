import { describe, it, expect, beforeEach, vi } from 'vitest'

// テスト対象のUserIntegrationService
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { type UserRepository } from '@/modules/user-authentication/server/domain/repositories/user.repository'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'
import { NextAuthUserBuilder, UserBuilder } from '@tests/__fixtures__/builders'

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

// モックイベントパブリッシャー
const mockEventPublisher = {
  publish: vi.fn(),
  publishAll: vi.fn(),
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
        id: UserId.generate(),
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

      // 既存のユーザー（異なるNextAuthId）
      const existingUserWithSameEmail = new UserBuilder()
        .withTestUser()
        .withEmail('duplicate@example.com')
        .build()

      // 新規ユーザーだが、メールアドレスが重複
      mockUserRepository.findByNextAuthId.mockResolvedValue(null)
      mockUserRepository.findByEmail.mockResolvedValue(existingUserWithSameEmail)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.createOrUpdateFromNextAuth(nextAuthUser)).rejects.toThrow(
        "User with email 'duplicate@example.com' already exists"
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
        id: UserId.generate(),
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
        'User not found: {"nextAuthId":"non-existent-user"}'
      )
    })
  })

  describe('プロフィール更新との統合', () => {
    it('ユーザープロフィールを更新できる', async () => {
      // Arrange（準備）
      const userId = UserId.generate()
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
      const userId = UserId.generate()
      const newProfile = UserProfile.createDefault('新しい名前')

      mockUserRepository.findById.mockResolvedValue(null)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(service.updateUserProfile(userId, newProfile)).rejects.toThrow(
        /User not found: \{"userId":/
      )
    })

    it('無効化されたユーザーのプロフィール更新はエラーが発生する', async () => {
      // Arrange（準備）
      const userId = UserId.generate()
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
      const userId = UserId.generate()
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
      const result = await service.deactivateUser(userId, 'USER_REQUEST', userId.getValue())

      // Assert（検証）
      expect(result.isActive()).toBe(false)
      expect(result.canLogin()).toBe(false)
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1)
    })

    it('存在しないユーザーの無効化はエラーが発生する', async () => {
      // Arrange（準備）
      const userId = UserId.generate()

      mockUserRepository.findById.mockResolvedValue(null)

      // Act & Assert（実行 & 検証）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      await expect(
        service.deactivateUser(userId, 'USER_REQUEST', userId.getValue())
      ).rejects.toThrow(/User not found: \{"userId":/)
    })

    it('既に無効化されたユーザーの再無効化はエラーが発生する', async () => {
      // Arrange（準備）
      const userId = UserId.generate()
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
      await expect(
        service.deactivateUser(userId, 'USER_REQUEST', userId.getValue())
      ).rejects.toThrow('既に無効化されたユーザーです')
    })
  })

  describe('ユーザー検索機能', () => {
    it('メールアドレスでユーザーを検索できる', async () => {
      // Arrange（準備）
      const email = new Email('test@example.com')
      const user = new User({
        id: UserId.generate(),
        nextAuthId: 'next-auth-123',
        email,
        profile: UserProfile.createDefault('テストユーザー'),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      mockUserRepository.findByEmail.mockResolvedValue(user)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.findUserByEmail(email)

      // Assert（検証）
      expect(result).toBe(user)
      expect(result?.getEmail().getValue()).toBe(email.getValue())
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email)
    })

    it('存在しないメールアドレスの場合はnullを返す', async () => {
      // Arrange（準備）
      const email = new Email('nonexistent@example.com')

      mockUserRepository.findByEmail.mockResolvedValue(null)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.findUserByEmail(email)

      // Assert（検証）
      expect(result).toBeNull()
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email)
    })

    it('ユーザーIDでユーザーを検索できる', async () => {
      // Arrange（準備）
      const userId = UserId.generate()
      const user = new User({
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new Email('test@example.com'),
        profile: UserProfile.createDefault('テストユーザー'),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      mockUserRepository.findById.mockResolvedValue(user)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.findUserById(userId)

      // Assert（検証）
      expect(result).toBe(user)
      expect(result?.getId().getValue()).toBe(userId.getValue())
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId)
    })

    it('存在しないユーザーIDの場合はnullを返す', async () => {
      // Arrange（準備）
      const userId = UserId.generate()

      mockUserRepository.findById.mockResolvedValue(null)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.findUserById(userId)

      // Assert（検証）
      expect(result).toBeNull()
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId)
    })
  })

  describe('NextAuth IDによるユーザー検索', () => {
    it('NextAuth IDでユーザーを検索できる', async () => {
      // Arrange（準備）
      const nextAuthId = 'next-auth-123'
      const user = new User({
        id: UserId.generate(),
        nextAuthId,
        email: new Email('test@example.com'),
        profile: UserProfile.createDefault('テストユーザー'),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      })

      mockUserRepository.findByNextAuthId.mockResolvedValue(user)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.findUserByNextAuthId(nextAuthId)

      // Assert（検証）
      expect(result).toBe(user)
      expect(result?.getNextAuthId()).toBe(nextAuthId)
      expect(mockUserRepository.findByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })

    it('存在しないNextAuth IDの場合はnullを返す', async () => {
      // Arrange（準備）
      const nextAuthId = 'non-existent-id'

      mockUserRepository.findByNextAuthId.mockResolvedValue(null)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.findUserByNextAuthId(nextAuthId)

      // Assert（検証）
      expect(result).toBeNull()
      expect(mockUserRepository.findByNextAuthId).toHaveBeenCalledWith(nextAuthId)
    })
  })

  describe('アクティブユーザー管理', () => {
    it('アクティブなユーザー一覧を取得できる', async () => {
      // Arrange（準備）
      const activeUsers = [
        new User({
          id: UserId.generate(),
          nextAuthId: 'next-auth-1',
          email: new Email('user1@example.com'),
          profile: UserProfile.createDefault('ユーザー1'),
          status: UserStatus.createActive(),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        }),
        new User({
          id: UserId.generate(),
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

  describe('イベント発行機能', () => {
    it('eventPublisherが設定されている場合、ドメインイベントが発行される', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()

      // 新規ユーザー作成時はドメインイベントが生成される
      mockUserRepository.findByNextAuthId.mockResolvedValue(null)
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.findByEmail.mockResolvedValue(null) // メールアドレスの重複チェック用

      // saveメソッドがイベントを持つユーザーを返すようにモック
      mockUserRepository.save.mockImplementation(async (user) => {
        // ユーザーが作成されるとUserCreatedFromNextAuthイベントが発生する
        return user
      })

      // eventPublisherが成功することをモック
      mockEventPublisher.publishAll.mockResolvedValue(undefined)

      // Act（実行）
      const service = new UserIntegrationService(
        mockUserRepository as UserRepository,
        mockEventPublisher as any
      )
      const result = await service.createOrUpdateFromNextAuth(nextAuthUser)

      // Assert（検証）
      expect(mockEventPublisher.publishAll).toHaveBeenCalledTimes(1)
      expect(mockEventPublisher.publishAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventName: 'user.createdFromNextAuth',
          }),
        ])
      )
      expect(result.domainEvents).toHaveLength(0) // イベントがクリアされていることを確認
    })

    it('eventPublisherが設定されていない場合、イベントは発行されない', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()

      mockUserRepository.findByNextAuthId.mockResolvedValue(null)
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.findByEmail.mockResolvedValue(null) // メールアドレスの重複チェック用
      mockUserRepository.save.mockImplementation(async (user) => user)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)
      const result = await service.createOrUpdateFromNextAuth(nextAuthUser)

      // Assert（検証）
      expect(mockEventPublisher.publishAll).not.toHaveBeenCalled()
      // eventPublisherがないため、イベントはクリアされない
      expect(result.domainEvents.length).toBeGreaterThan(0)
    })

    it('複数のイベントがある場合、すべて発行される', async () => {
      // Arrange（準備）
      const userId = UserId.generate()
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
      mockUserRepository.save.mockImplementation(async (user) => user)
      mockEventPublisher.publishAll.mockResolvedValue(undefined)

      // Act（実行）
      const service = new UserIntegrationService(
        mockUserRepository as UserRepository,
        mockEventPublisher as any
      )
      await service.updateUserProfile(userId, newProfile)

      // Assert（検証）
      expect(mockEventPublisher.publishAll).toHaveBeenCalledTimes(1)
      expect(mockEventPublisher.publishAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventName: 'user.profileUpdated',
          }),
        ])
      )
    })

    it('エラー発生時にeventPublisherがあれば統合失敗イベントが発行される', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const saveError = new Error('データベース保存エラー')

      // 新規ユーザー作成時にエラーが発生するシナリオ
      mockUserRepository.findByNextAuthId.mockResolvedValue(null)
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.findByEmail.mockResolvedValue(null)
      mockUserRepository.save.mockRejectedValue(saveError)

      // eventPublisherのモック
      mockEventPublisher.publish.mockResolvedValue(undefined)

      // Act（実行）
      const service = new UserIntegrationService(
        mockUserRepository as UserRepository,
        mockEventPublisher as any
      )

      // Assert（検証）
      await expect(service.createOrUpdateFromNextAuth(nextAuthUser)).rejects.toThrow(
        'データベース保存エラー'
      )

      // 統合失敗イベントが発行されたことを確認
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1)
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'user.nextAuthIntegrationFailed',
          getPayload: expect.any(Function),
        })
      )
    })

    it('エラー発生時にeventPublisherがなければイベントは発行されない', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const saveError = new Error('データベース保存エラー')

      // 新規ユーザー作成時にエラーが発生するシナリオ
      mockUserRepository.findByNextAuthId.mockResolvedValue(null)
      mockUserRepository.existsByEmail.mockResolvedValue(false)
      mockUserRepository.findByEmail.mockResolvedValue(null)
      mockUserRepository.save.mockRejectedValue(saveError)

      // Act（実行）
      const service = new UserIntegrationService(mockUserRepository as UserRepository)

      // Assert（検証）
      await expect(service.createOrUpdateFromNextAuth(nextAuthUser)).rejects.toThrow(
        'データベース保存エラー'
      )

      // イベントパブリッシャーが呼ばれないことを確認
      expect(mockEventPublisher.publish).not.toHaveBeenCalled()
    })
  })
})
