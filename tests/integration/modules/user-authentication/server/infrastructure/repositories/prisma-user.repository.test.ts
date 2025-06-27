import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'

// テスト対象のPrismaUserRepository
// ドメインオブジェクト
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

import {
  NextAuthUserBuilder,
  testDataHelpers,
} from '../../../../../../__fixtures__/builders'

describe('PrismaUserRepository（統合テスト）', () => {
  let prisma: PrismaClient
  let repository: PrismaUserRepository

  beforeEach(async () => {
    // テスト用のPrismaクライアントを作成
    prisma = new PrismaClient()
    repository = new PrismaUserRepository(prisma as any)

    // テストデータをクリア
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(async () => {
    // テスト後のクリーンアップ
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('ユーザーの保存', () => {
    it('新規ユーザーを保存できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)

      // NextAuthユーザーをデータベースに先に作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })

      // Act（実行）
      const savedUser = await repository.save(user)

      // Assert（検証）
      expect(savedUser).toBeDefined()
      expect(savedUser.getNextAuthId()).toBe(nextAuthUser.id)
      expect(savedUser.getEmail().getValue()).toBe(nextAuthUser.email)
      expect(savedUser.isActive()).toBe(true)

      // データベースに保存されていることを確認
      const dbUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(dbUser).toBeDefined()
      expect(dbUser?.email).toBe(nextAuthUser.email)
    })

    it('既存ユーザーを更新できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)

      // NextAuthユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })

      // 最初に保存
      await repository.save(user)

      // プロフィールを更新
      const newProfile = new UserProfile({
        displayName: '更新された名前',
        timezone: 'America/New_York',
        language: 'en',
        preferences: user.getProfile().getPreferences(),
      })
      user.updateProfile(newProfile)

      // Act（実行）
      const updatedUser = await repository.save(user)

      // Assert（検証）
      expect(updatedUser.getProfile().getDisplayName()).toBe('更新された名前')
      expect(updatedUser.getProfile().getLanguage()).toBe('en')

      // データベースで確認
      const dbUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(dbUser?.displayName).toBe('更新された名前')
      expect(dbUser?.preferredLanguage).toBe('en')
    })
  })

  describe('ユーザーの検索', () => {
    it('IDでユーザーを検索できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })
      await repository.save(user)

      // Act（実行）
      const foundUser = await repository.findById(user.getId())

      // Assert（検証）
      expect(foundUser).toBeDefined()
      expect(foundUser?.getId().getValue()).toBe(user.getId().getValue())
      expect(foundUser?.getEmail().getValue()).toBe(nextAuthUser.email)
    })

    it('NextAuthIDでユーザーを検索できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })
      await repository.save(user)

      // Act（実行）
      const foundUser = await repository.findByNextAuthId(nextAuthUser.id)

      // Assert（検証）
      expect(foundUser).toBeDefined()
      expect(foundUser?.getNextAuthId()).toBe(nextAuthUser.id)
      expect(foundUser?.getEmail().getValue()).toBe(nextAuthUser.email)
    })

    it('メールアドレスでユーザーを検索できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)
      const email = new Email(nextAuthUser.email)

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })
      await repository.save(user)

      // Act（実行）
      const foundUser = await repository.findByEmail(email)

      // Assert（検証）
      expect(foundUser).toBeDefined()
      expect(foundUser?.getEmail().getValue()).toBe(nextAuthUser.email)
      expect(foundUser?.getNextAuthId()).toBe(nextAuthUser.id)
    })

    it('存在しないユーザーの検索はnullを返す', async () => {
      // Arrange（準備）
      const nonExistentId = new UserId(testDataHelpers.userId()) // 正しい形式のID
      const nonExistentEmail = new Email('nonexistent@example.com')

      // Act & Assert（実行 & 検証）
      const userById = await repository.findById(nonExistentId)
      const userByNextAuthId = await repository.findByNextAuthId('non-existent-next-auth-id')
      const userByEmail = await repository.findByEmail(nonExistentEmail)

      expect(userById).toBeNull()
      expect(userByNextAuthId).toBeNull()
      expect(userByEmail).toBeNull()
    })
  })

  describe('ユーザーの存在確認', () => {
    it('NextAuthIDでユーザーの存在を確認できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })
      await repository.save(user)

      // Act & Assert（実行 & 検証）
      const exists = await repository.existsByNextAuthId(nextAuthUser.id)
      const notExists = await repository.existsByNextAuthId('non-existent-id')

      expect(exists).toBe(true)
      expect(notExists).toBe(false)
    })

    it('メールアドレスでユーザーの存在を確認できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)
      const email = new Email(nextAuthUser.email)
      const nonExistentEmail = new Email('nonexistent@example.com')

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })
      await repository.save(user)

      // Act & Assert（実行 & 検証）
      const exists = await repository.existsByEmail(email)
      const notExists = await repository.existsByEmail(nonExistentEmail)

      expect(exists).toBe(true)
      expect(notExists).toBe(false)
    })
  })

  describe('ユーザーの削除', () => {
    it('ユーザーを論理削除できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const user = User.createFromNextAuth(nextAuthUser)

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
          image: nextAuthUser.image,
          emailVerified: nextAuthUser.emailVerified,
        },
      })
      await repository.save(user)

      // Act（実行）
      const deleteResult = await repository.delete(user.getId())

      // Assert（検証）
      expect(deleteResult).toBe(true)

      // データベースから論理削除されていることを確認（statusがDEACTIVATEDになる）
      const deletedUser = await repository.findById(user.getId())
      expect(deletedUser).not.toBeNull()
      expect(deletedUser?.getStatus().isDeactivated()).toBe(true)
      expect(deletedUser?.isActive()).toBe(false)
    })

    it('存在しないユーザーの削除はfalseを返す', async () => {
      // Arrange（準備）
      const nonExistentId = new UserId(testDataHelpers.userId()) // 正しい形式のID

      // Act（実行）
      const deleteResult = await repository.delete(nonExistentId)

      // Assert（検証）
      expect(deleteResult).toBe(false)
    })
  })

  describe('アクティブユーザーの取得', () => {
    it('アクティブユーザーのリストを取得できる', async () => {
      // Arrange（準備）
      const activeUser1 = new NextAuthUserBuilder()
        .withId('active-1')
        .withEmail('active1@example.com')
        .build()
      const activeUser2 = new NextAuthUserBuilder()
        .withId('active-2')
        .withEmail('active2@example.com')
        .build()
      const deactivatedUser = new NextAuthUserBuilder()
        .withId('deactivated-1')
        .withEmail('deactivated@example.com')
        .build()

      // NextAuthユーザーを作成
      await prisma.user.createMany({
        data: [
          { id: activeUser1.id, email: activeUser1.email, name: activeUser1.name },
          { id: activeUser2.id, email: activeUser2.email, name: activeUser2.name },
          { id: deactivatedUser.id, email: deactivatedUser.email, name: deactivatedUser.name },
        ],
      })

      // ドメインユーザーを作成
      const user1 = User.createFromNextAuth(activeUser1)
      const user2 = User.createFromNextAuth(activeUser2)
      const user3 = User.createFromNextAuth(deactivatedUser)
      user3.deactivate('USER_REQUEST', user3.getId().getValue()) // 無効化

      await repository.save(user1)
      await repository.save(user2)
      await repository.save(user3)

      // Act（実行）
      const activeUsers = await repository.findActiveUsers()

      // Assert（検証）
      expect(activeUsers).toHaveLength(2)
      expect(activeUsers.every((user) => user.isActive())).toBe(true)
    })

    it('期間内のアクティブユーザー数を取得できる', async () => {
      // Arrange（準備）
      const recentUser = new NextAuthUserBuilder()
        .withId('recent')
        .withEmail('recent@example.com')
        .build()
      const oldUser = new NextAuthUserBuilder().withId('old').withEmail('old@example.com').build()

      // NextAuthユーザーを作成
      await prisma.user.createMany({
        data: [
          { id: recentUser.id, email: recentUser.email, name: recentUser.name },
          { id: oldUser.id, email: oldUser.email, name: oldUser.name },
        ],
      })

      // 最近ログインしたユーザーと古いユーザーを作成
      const user1 = User.createFromNextAuth(recentUser)
      user1.recordLogin(new Date()) // 今日ログイン

      const user2 = User.createFromNextAuth(oldUser)
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10) // 10日前にログイン
      user2.recordLogin(oldDate)

      await repository.save(user1)
      await repository.save(user2)

      // Act（実行）
      const recentActiveCount = await repository.countActiveUsersInPeriod(7) // 過去7日間

      // Assert（検証）
      expect(recentActiveCount).toBe(1) // 最近ログインしたユーザーのみ
    })
  })
})
