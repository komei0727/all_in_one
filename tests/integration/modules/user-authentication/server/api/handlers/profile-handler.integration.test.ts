import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import { ZodError } from 'zod'

import { PrismaClient } from '@/generated/prisma-test'
// テスト対象のハンドラー
import { ProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/profile-handler'
// 依存関係
import { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

import { NextAuthUserBuilder } from '../../../../../../__fixtures__/builders'
// テストヘルパー
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

describe('ProfileApiHandler 統合テスト', () => {
  let prisma: PrismaClient
  let repository: PrismaUserRepository
  let domainService: UserIntegrationService
  let applicationService: UserApplicationService
  let apiHandler: ProfileApiHandler

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient() as PrismaClient

    // 実際のサービスとハンドラーを構築
    repository = new PrismaUserRepository(prisma as unknown as PrismaClient)
    domainService = new UserIntegrationService(repository)
    applicationService = new UserApplicationService(domainService)
    apiHandler = new ProfileApiHandler(applicationService)

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

  describe('プロフィール取得フロー', () => {
    it('存在するユーザーのプロフィールを取得できる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('profile-get@example.com')
        .build()

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
      await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      // Act（実行）
      const result = await apiHandler.getProfile(nextAuthUser.id)

      // Assert（検証）
      expect(result).toBeDefined()
      expect(result.nextAuthId).toBe(nextAuthUser.id)
      expect(result.email).toBe(nextAuthUser.email)
      expect(result.profile).toBeDefined()
      expect(result.profile.displayName).toBeDefined()
      expect(result.profile.timezone).toBe('Asia/Tokyo')
      expect(result.profile.language).toBe('ja')
    })

    it('存在しないユーザーのプロフィール取得はエラーとなる', async () => {
      // Arrange（準備）
      const nonExistentId = 'non-existent-next-auth-id'

      // Act & Assert（実行 & 検証）
      await expect(apiHandler.getProfile(nonExistentId)).rejects.toThrow('ユーザーが見つかりません')
    })
  })

  describe('プロフィール更新フロー', () => {
    it('有効なデータでプロフィールを更新できる', async () => {
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
      await applicationService.createOrUpdateFromNextAuth(nextAuthUser)

      const updateRequest = {
        displayName: '統合テスト太郎',
        timezone: 'America/New_York',
        language: 'en' as const,
      }

      // Act（実行）
      const result = await apiHandler.updateProfile(nextAuthUser.id, updateRequest)

      // Assert（検証）
      expect(result.profile.displayName).toBe('統合テスト太郎')
      expect(result.profile.timezone).toBe('America/New_York')
      expect(result.profile.language).toBe('en')

      // データベースで実際に更新されていることを確認
      const updatedUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(updatedUser?.displayName).toBe('統合テスト太郎')
      expect(updatedUser?.timezone).toBe('America/New_York')
      expect(updatedUser?.preferredLanguage).toBe('en')
    })

    it('APIレイヤーでバリデーションエラーが発生する', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('validation-test@example.com')
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

      // 無効なリクエストデータ
      const invalidRequest = {
        displayName: '', // 空文字は無効
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // Act & Assert（実行 & 検証）
      await expect(apiHandler.updateProfile(nextAuthUser.id, invalidRequest)).rejects.toThrow(
        ZodError
      )

      // データベースが変更されていないことを確認
      const unchangedUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(unchangedUser?.displayName).not.toBe('')
    })

    it('100文字を超える表示名はバリデーションエラーとなる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('long-name@example.com')
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

      const invalidRequest = {
        displayName: 'あ'.repeat(101), // 101文字
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // Act & Assert（実行 & 検証）
      await expect(apiHandler.updateProfile(nextAuthUser.id, invalidRequest)).rejects.toThrow(
        ZodError
      )
    })

    it('サポートされていない言語はバリデーションエラーとなる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('invalid-lang@example.com')
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

      const invalidRequest = {
        displayName: '有効な名前',
        timezone: 'Asia/Tokyo',
        language: 'fr' as unknown as 'ja' | 'en', // フランス語はサポートされていない
      }

      // Act & Assert（実行 & 検証）
      await expect(apiHandler.updateProfile(nextAuthUser.id, invalidRequest)).rejects.toThrow(
        ZodError
      )
    })

    it('存在しないユーザーのプロフィール更新はエラーとなる', async () => {
      // Arrange（準備）
      const nonExistentId = 'non-existent-user'
      const updateRequest = {
        displayName: '更新太郎',
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // Act & Assert（実行 & 検証）
      await expect(apiHandler.updateProfile(nonExistentId, updateRequest)).rejects.toThrow(
        'ユーザーが見つかりません'
      )
    })

    it('空白のみの表示名はトリムされてバリデーションエラーとなる', async () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder()
        .withTestUser()
        .withEmail('whitespace-test@example.com')
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

      const invalidRequest = {
        displayName: '   ', // 空白のみ
        timezone: 'Asia/Tokyo',
        language: 'ja' as const,
      }

      // Act & Assert（実行 & 検証）
      await expect(apiHandler.updateProfile(nextAuthUser.id, invalidRequest)).rejects.toThrow(
        ZodError
      )

      // ZodErrorの詳細を確認
      try {
        await apiHandler.updateProfile(nextAuthUser.id, invalidRequest)
      } catch (error) {
        if (error instanceof ZodError) {
          const displayNameError = error.errors.find((e) => e.path[0] === 'displayName')
          expect(displayNameError?.message).toBe('表示名は必須です')
        }
      }
    })
  })

  describe('エンドツーエンドシナリオ', () => {
    it('ユーザー作成からプロフィール更新までの完全なフロー', async () => {
      // Arrange（準備）- 新規ユーザー
      const nextAuthUser = new NextAuthUserBuilder()
        .withId('e2e-test-user')
        .withEmail('e2e-test@example.com')
        .withName('E2Eテストユーザー')
        .build()

      // Step 1: NextAuthユーザーを作成
      await prisma.user.create({
        data: {
          id: nextAuthUser.id,
          email: nextAuthUser.email,
          name: nextAuthUser.name,
        },
      })

      // Step 2: ドメインユーザーを作成
      const createdUser = await applicationService.createOrUpdateFromNextAuth(nextAuthUser)
      expect(createdUser).toBeDefined()

      // Step 3: プロフィールを取得
      const profile = await apiHandler.getProfile(nextAuthUser.id)
      expect(profile.email).toBe(nextAuthUser.email)
      expect(profile.profile.displayName).toBe('E2Eテストユーザー')

      // Step 4: プロフィールを更新（1回目）
      const firstUpdate = await apiHandler.updateProfile(nextAuthUser.id, {
        displayName: '更新後の名前',
        timezone: 'America/New_York',
        language: 'en',
      })
      expect(firstUpdate.profile.displayName).toBe('更新後の名前')
      expect(firstUpdate.profile.timezone).toBe('America/New_York')
      expect(firstUpdate.profile.language).toBe('en')

      // Step 5: プロフィールを更新（2回目）
      const secondUpdate = await apiHandler.updateProfile(nextAuthUser.id, {
        displayName: '再更新後の名前',
        timezone: 'America/Los_Angeles',
        language: 'ja',
      })
      expect(secondUpdate.profile.displayName).toBe('再更新後の名前')
      expect(secondUpdate.profile.timezone).toBe('America/Los_Angeles')
      expect(secondUpdate.profile.language).toBe('ja')

      // Step 6: 最終的なデータベース状態を確認
      const finalUser = await prisma.domainUser.findUnique({
        where: { nextAuthId: nextAuthUser.id },
      })
      expect(finalUser).toBeDefined()
      expect(finalUser?.displayName).toBe('再更新後の名前')
      expect(finalUser?.timezone).toBe('America/Los_Angeles')
      expect(finalUser?.preferredLanguage).toBe('ja')
      expect(finalUser?.status).toBe('ACTIVE')
    })
  })
})
