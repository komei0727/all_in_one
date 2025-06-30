import { faker } from '@faker-js/faker/locale/ja'
import { beforeEach, describe, expect, it, afterEach } from 'vitest'

import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import type { NextAuthUser } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { EmailAlreadyExistsException } from '@/modules/user-authentication/server/domain/exceptions'
import { UserFactory } from '@/modules/user-authentication/server/domain/factories/user.factory'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'
import { getTestPrismaClient } from '@tests/helpers/database.helper'

describe('UserFactory - 統合テスト', () => {
  let userRepository: PrismaUserRepository
  let userFactory: UserFactory
  const prisma = getTestPrismaClient()

  beforeEach(async () => {
    // データベースをクリア（ユーザー関連のテーブルのみ）
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()

    // リポジトリとファクトリを初期化
    userRepository = new PrismaUserRepository(prisma as any)
    userFactory = new UserFactory(userRepository)
  })

  afterEach(async () => {
    // テスト後のクリーンアップ
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('fromNextAuthUser', () => {
    it('NextAuthユーザーから新規ユーザーを作成し、データベースに保存できる', async () => {
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

      // NextAuthユーザーをデータベースに作成（外部キー制約を満たすため）
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })

      // When: ファクトリでユーザーを作成
      const user = await userFactory.fromNextAuthUser(nextAuthUser)

      // ユーザーをデータベースに保存
      await userRepository.save(user)

      // Then: データベースから取得して検証
      const savedUser = await userRepository.findByNextAuthId(nextAuthUser.id)
      expect(savedUser).toBeDefined()
      expect(savedUser?.getNextAuthId()).toBe(nextAuthUser.id)
      expect(savedUser?.getEmail().getValue()).toBe(nextAuthUser.email)
      expect(savedUser?.getProfile().getDisplayName()).toBe(nextAuthUser.name)
      expect(savedUser?.getStatus().isActive()).toBe(true)
    })

    it('同じメールアドレスで複数のユーザーを作成しようとするとエラーが発生する', async () => {
      // Given: 最初のユーザーを作成して保存
      const sharedEmail = faker.internet.email()
      const firstUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: sharedEmail,
        emailVerified: faker.date.past(),
        name: faker.person.fullName(),
        image: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      // NextAuthユーザーをデータベースに作成
      await prisma.user.create({
        data: {
          id: firstUser.id,
          email: firstUser.email,
          name: firstUser.name,
          image: firstUser.image,
          emailVerified: firstUser.emailVerified,
        },
      })

      const user1 = await userFactory.fromNextAuthUser(firstUser)
      await userRepository.save(user1)

      // When: 同じメールアドレスで2人目のユーザーを作成しようとする
      const secondUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: sharedEmail,
        emailVerified: faker.date.past(),
        name: faker.person.fullName(),
        image: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      // Then: EmailAlreadyExistsExceptionが投げられる
      await expect(userFactory.fromNextAuthUser(secondUser)).rejects.toThrow(
        EmailAlreadyExistsException
      )
      await expect(userFactory.fromNextAuthUser(secondUser)).rejects.toThrow(sharedEmail)
    })
  })

  describe('fromNextAuthUserWithProfile', () => {
    it('カスタムプロフィール付きでユーザーを作成し、データベースに保存できる', async () => {
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
        timezone: 'Europe/London',
        language: 'en',
        preferences: new UserPreferences({
          theme: 'dark',
          notifications: false,
          emailFrequency: 'weekly',
        }),
      })

      // NextAuthユーザーをデータベースに作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })

      // When: カスタムプロフィール付きでユーザーを作成
      const user = await userFactory.fromNextAuthUserWithProfile(nextAuthUser, customProfile)
      await userRepository.save(user)

      // Then: データベースから取得して検証
      const savedUser = await userRepository.findByEmail(new Email(nextAuthUser.email))
      expect(savedUser).toBeDefined()
      expect(savedUser?.getProfile().getDisplayName()).toBe(customProfile.getDisplayName())
      expect(savedUser?.getProfile().getTimezone()).toBe('Europe/London')
      expect(savedUser?.getProfile().getLanguage()).toBe('en')
      expect(savedUser?.getProfile().getPreferences().getTheme()).toBe('dark')
      expect(savedUser?.getProfile().getPreferences().getNotifications()).toBe(false)
      expect(savedUser?.getProfile().getPreferences().getEmailFrequency()).toBe('weekly')
    })
  })

  describe('ドメインイベント', () => {
    it('ユーザー作成時にUserCreatedFromNextAuthEventが発行される', async () => {
      // Given: NextAuthユーザー
      const nextAuthUser: NextAuthUser = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        emailVerified: faker.date.past(),
        name: faker.person.fullName(),
        image: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }

      // When: ユーザーを作成
      const user = await userFactory.fromNextAuthUser(nextAuthUser)

      // Then: イベントが発行されている
      const events = user.domainEvents
      expect(events).toHaveLength(1)
      expect(events[0].eventName).toBe('user.createdFromNextAuth')
      expect(events[0].aggregateId).toBe(user.getId().getValue())
    })
  })
})
