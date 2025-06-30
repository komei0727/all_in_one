import { faker } from '@faker-js/faker/locale/ja'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import {
  User,
  type NextAuthUser,
} from '@/modules/user-authentication/server/domain/entities/user.entity'
import { UserCreatedFromNextAuthEvent } from '@/modules/user-authentication/server/domain/events/user-created-from-nextauth.event'
import { EmailAlreadyExistsException } from '@/modules/user-authentication/server/domain/exceptions'
import { UserFactory } from '@/modules/user-authentication/server/domain/factories/user.factory'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'

describe('UserFactory', () => {
  let mockUserRepository: any
  let userFactory: UserFactory

  beforeEach(() => {
    // リポジトリのモックを作成
    mockUserRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByNextAuthId: vi.fn(),
      existsByEmail: vi.fn(),
      exists: vi.fn(),
      findActiveUsers: vi.fn(),
      countActiveUsersInPeriod: vi.fn(),
      deleteById: vi.fn(),
    }

    userFactory = new UserFactory(mockUserRepository)
  })

  describe('fromNextAuthUser', () => {
    it('NextAuthユーザーから新規ユーザーを作成できる', async () => {
      // Given: NextAuthユーザー情報
      const nextAuthUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        emailVerified: faker.date.past(),
        name: faker.person.fullName(),
        image: faker.image.avatar(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      // メールアドレスが存在しないことを設定
      mockUserRepository.findByEmail.mockResolvedValue(null)

      // When: ファクトリでユーザーを作成
      const user = await userFactory.fromNextAuthUser(nextAuthUser)

      // Then: 正しくユーザーが作成されている
      expect(user).toBeInstanceOf(User)
      expect(user.getNextAuthId()).toBe(nextAuthUser.id)
      expect(user.getEmail().getValue()).toBe(nextAuthUser.email)
      expect(user.getProfile().getDisplayName()).toBe(nextAuthUser.name)
      expect(user.getStatus().isActive()).toBe(true)
      expect(user.getLastLoginAt()).toBeNull()

      // ドメインイベントが発行されている
      const events = user.domainEvents
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(UserCreatedFromNextAuthEvent)

      const event = events[0] as UserCreatedFromNextAuthEvent
      expect(event.aggregateId).toBe(user.getId().getValue())
      expect(event.nextAuthId).toBe(nextAuthUser.id)
      expect(event.email).toBe(nextAuthUser.email)
      expect(event.displayName).toBe(nextAuthUser.name)
    })

    it('NextAuthユーザーの名前がない場合はメールアドレスをディスプレイ名として使用する', async () => {
      // Given: 名前のないNextAuthユーザー
      const nextAuthUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        emailVerified: faker.date.past(),
        name: null,
        image: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      mockUserRepository.findByEmail.mockResolvedValue(null)

      // When: ファクトリでユーザーを作成
      const user = await userFactory.fromNextAuthUser(nextAuthUser)

      // Then: メールアドレスがディスプレイ名として使用される
      expect(user.getProfile().getDisplayName()).toBe(nextAuthUser.email)

      // イベントでもメールアドレスがディスプレイ名として記録される
      const event = user.domainEvents[0] as UserCreatedFromNextAuthEvent
      expect(event.displayName).toBe(nextAuthUser.email)
    })

    it('メールアドレスが既に存在する場合はEmailAlreadyExistsExceptionを投げる', async () => {
      // Given: 既存のユーザーと同じメールアドレスを持つNextAuthユーザー
      const existingEmail = faker.internet.email()
      const nextAuthUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: existingEmail,
        emailVerified: faker.date.past(),
        name: faker.person.fullName(),
        image: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      // 既存のユーザーを返すように設定
      const existingUser = new User({
        id: UserId.generate(),
        nextAuthId: faker.string.uuid(),
        email: new Email(existingEmail),
        profile: UserProfile.createDefault(faker.person.fullName()),
        status: UserStatus.createActive(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastLoginAt: null,
      })
      mockUserRepository.findByEmail.mockResolvedValue(existingUser)

      // When & Then: EmailAlreadyExistsExceptionが投げられる
      await expect(userFactory.fromNextAuthUser(nextAuthUser)).rejects.toThrow(
        EmailAlreadyExistsException
      )
      await expect(userFactory.fromNextAuthUser(nextAuthUser)).rejects.toThrow(existingEmail)
    })
  })

  describe('fromNextAuthUserWithProfile', () => {
    it('カスタムプロフィール付きでユーザーを作成できる', async () => {
      // Given: NextAuthユーザーとカスタムプロフィール
      const nextAuthUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        emailVerified: faker.date.past(),
        name: faker.person.fullName(),
        image: faker.image.avatar(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      const customProfile = new UserProfile({
        displayName: faker.person.fullName(),
        timezone: 'America/New_York',
        language: 'en',
        preferences: new UserPreferences({
          theme: 'dark',
          notifications: true,
          emailFrequency: 'daily',
        }),
      })

      mockUserRepository.findByEmail.mockResolvedValue(null)

      // When: カスタムプロフィール付きでユーザーを作成
      const user = await userFactory.fromNextAuthUserWithProfile(nextAuthUser, customProfile)

      // Then: カスタムプロフィールが設定されている
      expect(user.getProfile()).toEqual(customProfile)
      expect(user.getProfile().getDisplayName()).toBe(customProfile.getDisplayName())
      expect(user.getProfile().getTimezone()).toBe('America/New_York')
      expect(user.getProfile().getLanguage()).toBe('en')
      expect(user.getProfile().getPreferences().getTheme()).toBe('dark')

      // イベントにカスタムプロフィールのディスプレイ名が記録される
      const event = user.domainEvents[0] as UserCreatedFromNextAuthEvent
      expect(event.displayName).toBe(customProfile.getDisplayName())
    })

    it('カスタムプロフィールでもメールアドレスの重複チェックが行われる', async () => {
      // Given: 既存のユーザーと同じメールアドレス
      const existingEmail = faker.internet.email()
      const nextAuthUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: existingEmail,
        emailVerified: faker.date.past(),
        name: faker.person.fullName(),
        image: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      const customProfile = UserProfile.createDefault(faker.person.fullName())

      // 既存のユーザーを返すように設定
      const existingUser = new User({
        id: UserId.generate(),
        nextAuthId: faker.string.uuid(),
        email: new Email(existingEmail),
        profile: UserProfile.createDefault(faker.person.fullName()),
        status: UserStatus.createActive(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastLoginAt: null,
      })
      mockUserRepository.findByEmail.mockResolvedValue(existingUser)

      // When & Then: EmailAlreadyExistsExceptionが投げられる
      await expect(
        userFactory.fromNextAuthUserWithProfile(nextAuthUser, customProfile)
      ).rejects.toThrow(EmailAlreadyExistsException)
    })
  })
})
