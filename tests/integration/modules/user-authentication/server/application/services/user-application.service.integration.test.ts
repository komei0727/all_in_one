import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import { PrismaClient } from '@/generated/prisma-test'
import {
  UserIdBuilder,
  EmailBuilder,
  UserProfileBuilder,
  NextAuthUserBuilder,
} from '../../../../../../__fixtures__/builders'

// テスト対象のサービス
import { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

// ドメインオブジェクト
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'

// テストヘルパー
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

describe('UserApplicationService 統合テスト', () => {
  let prisma: PrismaClient
  let repository: PrismaUserRepository
  let domainService: UserIntegrationService
  let applicationService: UserApplicationService

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient() as PrismaClient

    // 実際のリポジトリとサービスを使用
    repository = new PrismaUserRepository(prisma as any)
    domainService = new UserIntegrationService(repository)
    applicationService = new UserApplicationService(domainService)

    // テストデータをクリア
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(async () => {
    // テスト後のクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後のクリーンアップ
    await cleanupPrismaClient()
  })

  describe('NextAuth統合フロー', () => {
    it('新規NextAuthユーザーからドメインユーザーを作成し、データベースに保存できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('integration-test@example.com')
        .build()

      // NextAuthユーザーをデータベースに作成（NextAuthのテーブル）
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
      const result = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // Assert（検証）
      expect(result).toBeDefined()
      expect(result.nextAuthId).toBe(nextAuthUser.id)
      expect(result.email).toBe(nextAuthUser.email)
      expect(result.status).toBe('ACTIVE')
      expect(result.isActive).toBe(true)

      // データベースに実際に保存されていることを確認
      const savedUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(savedUser).toBeDefined()
      expect(savedUser?.email).toBe(nextAuthUser.email)
      expect(savedUser?.status).toBe('ACTIVE')
    })

    it('既存ユーザーの場合は同期して更新される', async () => {
      // Arrange（準備）- 既存ユーザーを作成
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('existing@example.com')
        .build()

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

      // 初回作成
      await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // NextAuthユーザー情報を更新
      const updatedNextAuthUser = {
        ...nextAuthUser,
        name: '更新された名前',
        image: 'https://example.com/new-image.jpg',
      }

      // NextAuthユーザーを更新
      await prisma.user.update({
        where: { id: nextAuthUser.id },
        data: {
          name: updatedNextAuthUser.name,
          image: updatedNextAuthUser.image,
        },
      })

      // Act（実行）- 同期
      const result = await applicationService.createOrUpdateFromNextAuth(updatedNextAuthUser)

      // Assert（検証）
      expect(result.nextAuthId).toBe(nextAuthUser.id)
      // 同期されていることを確認（実装に依存）

      // データベースで更新されていることを確認
      const updatedUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(updatedUser).toBeDefined()
      expect(updatedUser?.updatedAt).not.toEqual(updatedUser?.createdAt)
    })

    it('メールアドレスが既に使用されている場合はエラーとなる', async () => {
      // Arrange（準備）- 既存ユーザーを作成
      const existingEmail = 'duplicate@example.com'
      const existingUser = new NextAuthUserBuilder()
        .withId('existing-user')
        .withEmail(existingEmail)
        .build()

      // 既存のNextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
      })
      await applicationService.createOrUpdateFromNextAuth(existingUser)

      // 同じメールアドレスで別のNextAuthユーザーを作成しようとする
      const newUser = new NextAuthUserBuilder()
        .withId('new-user')
        .withEmail('different-nextauth@example.com') // NextAuthでは別のメールアドレス
        .build()

      await prisma.user.create({
        data: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      })

      // Act & Assert（実行 & 検証）
      // ドメインユーザー作成時に既存のメールアドレスを指定してエラーを発生させる
      // （この統合テストでは、NextAuthとドメインユーザーのメールアドレスが一致していることを前提としているため、
      //   実際にはこのケースは発生しませんが、テストとして実装は維持します）

      // 既存ユーザーのメールアドレスでドメインユーザーを作成しようとする別のシナリオ
      const duplicateEmailUser = {
        ...newUser,
        email: existingEmail, // 既存のメールアドレスを使用
      }

      await expect(
        applicationService.createOrUpdateFromNextAuth(duplicateEmailUser)
      ).rejects.toThrow('メールアドレスが既に使用されています')
    })
  })

  describe('認証成功時の処理', () => {
    it('認証成功時にログイン日時が記録される', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('login-test@example.com')
        .build()

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })
      await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // Act（実行）
      const beforeLogin = new Date()
      const result = await applicationService.handleSuccessfulAuthentication(nextAuthUser.id)
      const afterLogin = new Date()

      // Assert（検証）
      expect(result.lastLoginAt).toBeDefined()
      expect(result.lastLoginAt).not.toBeNull()

      // データベースでログイン日時が更新されていることを確認
      const loggedInUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(loggedInUser?.lastLoginAt).toBeDefined()
      expect(loggedInUser?.lastLoginAt?.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime())
      expect(loggedInUser?.lastLoginAt?.getTime()).toBeLessThanOrEqual(afterLogin.getTime())
    })

    it('無効化されたユーザーはログインできない', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('deactivated-test@example.com')
        .build()

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })
      const createdUser = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // ユーザーを無効化
      await applicationService.deactivateUser(createdUser.id)

      // Act & Assert（実行 & 検証）
      await expect(
        applicationService.handleSuccessfulAuthentication(nextAuthUser.id)
      ).rejects.toThrow('アカウントが無効化されています')
    })
  })

  describe('プロフィール更新フロー', () => {
    it('ユーザープロフィールを更新し、データベースに反映される', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('profile-update@example.com')
        .build()

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })
      const createdUser = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // Act（実行）
      const updateRequest = {
        displayName: '新しい表示名',
        timezone: 'America/New_York',
        language: 'en' as const,
      }
      const result = await applicationService.updateUserProfile(createdUser.id, updateRequest)

      // Assert（検証）
      expect(result.profile.displayName).toBe('新しい表示名')
      expect(result.profile.timezone).toBe('America/New_York')
      expect(result.profile.language).toBe('en')

      // データベースで実際に更新されていることを確認
      const updatedUser = await prisma.domainUser.findUnique({
        where: { id: createdUser.id },
      })
      expect(updatedUser?.displayName).toBe('新しい表示名')
      expect(updatedUser?.timezone).toBe('America/New_York')
      expect(updatedUser?.preferredLanguage).toBe('en')
    })

    it('無効な表示名（空文字）でプロフィール更新はエラーとなる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('invalid-profile@example.com')
        .build()

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })
      const createdUser = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // Act & Assert（実行 & 検証）
      await expect(
        applicationService.updateUserProfile(createdUser.id, {
          displayName: '',
          timezone: 'Asia/Tokyo',
          language: 'ja',
        })
      ).rejects.toThrow('表示名は必須です')

      // データベースが変更されていないことを確認
      const unchangedUser = await prisma.domainUser.findUnique({
        where: { id: createdUser.id },
      })
      expect(unchangedUser?.displayName).not.toBe('')
    })
  })

  describe('ユーザー無効化フロー', () => {
    it('アクティブユーザーを無効化できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('deactivate-test@example.com')
        .build()

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })
      const createdUser = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // Act（実行）
      const result = await applicationService.deactivateUser(createdUser.id)

      // Assert（検証）
      expect(result.status).toBe('DEACTIVATED')
      expect(result.isActive).toBe(false)

      // データベースで実際に無効化されていることを確認
      const deactivatedUser = await prisma.domainUser.findUnique({
        where: { id: createdUser.id },
      })
      expect(deactivatedUser?.status).toBe('DEACTIVATED')

      // 無効化されたユーザーは論理削除（物理削除されていない）
      expect(deactivatedUser).toBeDefined()
    })

    it('既に無効化されたユーザーの再無効化はエラーとなる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('already-deactivated@example.com')
        .build()

      // NextAuthユーザーとドメインユーザーを作成し、無効化
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })
      const createdUser = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)
      await applicationService.deactivateUser(createdUser.id)

      // Act & Assert（実行 & 検証）
      await expect(applicationService.deactivateUser(createdUser.id)).rejects.toThrow(
        '既に無効化されたユーザーです'
      )
    })
  })

  describe('ユーザー検索機能', () => {
    it('様々な条件でユーザーを検索できる', async () => {
      // Arrange（準備）- 複数のユーザーを作成
      const users = [
        new NextAuthUserBuilder().withId('search-1').withEmail('search1@example.com').build(),
        new NextAuthUserBuilder().withId('search-2').withEmail('search2@example.com').build(),
      ]

      // NextAuthユーザーとドメインユーザーを作成
      for (const user of users) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        })
        await applicationService.createOrUpdateFromNextAuth(user)
      }

      // Act（実行）- 各種検索
      const byId = await applicationService.getUserById(
        (await prisma.domainUser.findFirst({ where: { email: 'search1@example.com' } }))!.id
      )
      const byEmail = await applicationService.getUserByEmail('search2@example.com')
      const byNextAuthId = await applicationService.getUserByNextAuthId('search-1')

      // Assert（検証）
      expect(byId?.email).toBe('search1@example.com')
      expect(byEmail?.email).toBe('search2@example.com')
      expect(byNextAuthId?.nextAuthId).toBe('search-1')
    })

    it('アクティブユーザーのみを取得できる', async () => {
      // Arrange（準備）
      const activeUser = new NextAuthUserBuilder()
        .withId('active-user')
        .withEmail('active@example.com')
        .build()
      const deactivatedUser = new NextAuthUserBuilder()
        .withId('deactivated-user')
        .withEmail('deactivated@example.com')
        .build()

      // ユーザーを作成
      for (const user of [activeUser, deactivatedUser]) {
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        })
      }

      const active = await applicationService.createOrUpdateFromNextAuth(activeUser)
      const deactivated = await applicationService.createOrUpdateFromNextAuth(deactivatedUser)
      await applicationService.deactivateUser(deactivated.id)

      // Act（実行）
      const activeUsers = await applicationService.getActiveUsers()

      // Assert（検証）
      expect(activeUsers).toHaveLength(1)
      expect(activeUsers[0].email).toBe('active@example.com')
      expect(activeUsers.every((user) => user.isActive)).toBe(true)
    })
  })

  describe('トランザクション処理の検証', () => {
    it('プロフィール更新中にエラーが発生した場合、変更はロールバックされる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('transaction-test@example.com')
        .build()

      // NextAuthユーザーとドメインユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })
      const createdUser = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // 元のプロフィールを記録
      const originalUser = await prisma.domainUser.findUnique({
        where: { id: createdUser.id },
      })

      // Act & Assert（実行 & 検証）
      // 非常に長い表示名（100文字超）でエラーを発生させる
      const longDisplayName = 'あ'.repeat(101)
      await expect(
        applicationService.updateUserProfile(createdUser.id, {
          displayName: longDisplayName,
          timezone: 'America/New_York',
          language: 'en',
        })
      ).rejects.toThrow('表示名は100文字以内で入力してください')

      // データベースが変更されていないことを確認（ロールバック）
      const unchangedUser = await prisma.domainUser.findUnique({
        where: { id: createdUser.id },
      })
      expect(unchangedUser?.displayName).toBe(originalUser?.displayName)
      expect(unchangedUser?.timezone).toBe(originalUser?.timezone)
      expect(unchangedUser?.preferredLanguage).toBe(originalUser?.preferredLanguage)
    })
  })
})
