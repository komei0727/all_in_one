import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'
import { createUserTestData } from '../../../../../../__fixtures__/builders/user-authentication/user.builder'

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository
  let mockPrismaClient: any

  beforeEach(() => {
    // Prismaクライアントのモックを作成
    mockPrismaClient = {
      domainUser: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    }
    repository = new PrismaUserRepository(mockPrismaClient)
  })

  describe('findById', () => {
    it('IDでユーザーを検索し、ドメインエンティティを返す', async () => {
      // テストデータの準備
      const testUserBuilder = createUserTestData()
      const testUser = testUserBuilder.build()
      const prismaUser = {
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: testUser.displayName,
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: testUser.status,
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: testUser.displayName,
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
        },
      }

      mockPrismaClient.domainUser.findUnique.mockResolvedValue(prismaUser)

      // 実行
      const userId = new UserId(testUser.id)
      const result = await repository.findById(userId)

      // 検証
      expect(mockPrismaClient.domainUser.findUnique).toHaveBeenCalledWith({
        where: { id: testUser.id },
        include: { nextAuthUser: true },
      })
      expect(result).not.toBeNull()
      expect(result?.getId().getValue()).toBe(testUser.id)
      expect(result?.getEmail().getValue()).toBe(testUser.email)
    })

    it('ユーザーが存在しない場合はnullを返す', async () => {
      // モックの設定
      mockPrismaClient.domainUser.findUnique.mockResolvedValue(null)

      // 実行
      const userId = new UserId(testDataHelpers.userId())
      const result = await repository.findById(userId)

      // 検証
      expect(result).toBeNull()
    })
  })

  describe('findByNextAuthId', () => {
    it('NextAuthIDでユーザーを検索し、ドメインエンティティを返す', async () => {
      // テストデータの準備
      const testUserBuilder = createUserTestData()
      const testUser = testUserBuilder.build()
      const prismaUser = {
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: testUser.displayName,
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: testUser.status,
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: testUser.displayName,
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
        },
      }

      mockPrismaClient.domainUser.findUnique.mockResolvedValue(prismaUser)

      // 実行
      const result = await repository.findByNextAuthId(testUser.nextAuthId)

      // 検証
      expect(mockPrismaClient.domainUser.findUnique).toHaveBeenCalledWith({
        where: { nextAuthId: testUser.nextAuthId },
        include: { nextAuthUser: true },
      })
      expect(result).not.toBeNull()
      expect(result?.getNextAuthId()).toBe(testUser.nextAuthId)
    })
  })

  describe('findByEmail', () => {
    it('メールアドレスでユーザーを検索し、ドメインエンティティを返す', async () => {
      // テストデータの準備
      const testUserBuilder = createUserTestData()
      const testUser = testUserBuilder.build()
      const prismaUser = {
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: testUser.displayName,
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: testUser.status,
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: testUser.displayName,
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
        },
      }

      mockPrismaClient.domainUser.findUnique.mockResolvedValue(prismaUser)

      // 実行
      const email = new Email(testUser.email)
      const result = await repository.findByEmail(email)

      // 検証
      expect(mockPrismaClient.domainUser.findUnique).toHaveBeenCalledWith({
        where: { email: testUser.email },
        include: { nextAuthUser: true },
      })
      expect(result).not.toBeNull()
      expect(result?.getEmail().getValue()).toBe(testUser.email)
    })
  })

  describe('save', () => {
    it('新規ユーザーを作成する', async () => {
      // テストデータの準備
      const testUserBuilder = createUserTestData()
      const testUser = testUserBuilder.build()
      const userBuilder = createUserTestData()
      const user = userBuilder
        .withId(testUser.id)
        .withNextAuthId(testUser.nextAuthId)
        .withEmail(testUser.email)
        .toDomainEntity()

      // 既存ユーザーなし
      mockPrismaClient.domainUser.findUnique.mockResolvedValue(null)

      // 作成結果
      const createdUser = {
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: testUser.displayName,
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: testUser.status,
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: testUser.displayName,
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
        },
      }
      mockPrismaClient.domainUser.create.mockResolvedValue(createdUser)

      // 実行
      const result = await repository.save(user)

      // 検証
      expect(mockPrismaClient.domainUser.findUnique).toHaveBeenCalledWith({
        where: { id: testUser.id },
      })

      // createが呼ばれたことを確認（詳細なパラメータ検証は複雑すぎるため基本的な項目のみ）
      expect(mockPrismaClient.domainUser.create).toHaveBeenCalledTimes(1)
      const createCall = mockPrismaClient.domainUser.create.mock.calls[0][0]
      expect(createCall.data.id).toBe(testUser.id)
      expect(createCall.data.nextAuthId).toBe(testUser.nextAuthId)
      expect(createCall.data.email).toBe(testUser.email)
      expect(createCall.include.nextAuthUser).toBe(true)

      expect(result.getId().getValue()).toBe(testUser.id)
    })

    it('既存ユーザーを更新する', async () => {
      // テストデータの準備
      const testUserBuilder = createUserTestData()
      const testUser = testUserBuilder.build()
      const userBuilder = createUserTestData()
      const user = userBuilder
        .withId(testUser.id)
        .withNextAuthId(testUser.nextAuthId)
        .withEmail(testUser.email)
        .toDomainEntity()

      // 既存ユーザーあり
      const existingUser = { id: testUser.id }
      mockPrismaClient.domainUser.findUnique.mockResolvedValue(existingUser)

      // 更新結果
      const updatedUser = {
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: testUser.displayName,
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: testUser.status,
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: new Date(),
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: testUser.displayName,
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: new Date(),
        },
      }
      mockPrismaClient.domainUser.update.mockResolvedValue(updatedUser)

      // 実行
      const result = await repository.save(user)

      // 検証
      expect(mockPrismaClient.domainUser.update).toHaveBeenCalledTimes(1)
      const updateCall = mockPrismaClient.domainUser.update.mock.calls[0][0]
      expect(updateCall.where.id).toBe(testUser.id)
      expect(updateCall.data.nextAuthId).toBe(testUser.nextAuthId)
      expect(updateCall.data.email).toBe(testUser.email)
      expect(updateCall.include.nextAuthUser).toBe(true)

      expect(result.getId().getValue()).toBe(testUser.id)
    })
  })

  describe('delete', () => {
    it('ユーザーを論理削除し、trueを返す', async () => {
      // モックの設定
      mockPrismaClient.domainUser.update.mockResolvedValue({})

      // 実行
      const userId = new UserId(testDataHelpers.userId())
      const result = await repository.delete(userId)

      // 検証
      expect(mockPrismaClient.domainUser.update).toHaveBeenCalledWith({
        where: { id: userId.getValue() },
        data: {
          status: 'DEACTIVATED',
          updatedAt: expect.any(Date),
        },
      })
      expect(result).toBe(true)
    })

    it('ユーザーが存在しない場合、falseを返す', async () => {
      // モックの設定（エラーをスロー）
      mockPrismaClient.domainUser.update.mockRejectedValue(new Error('Record not found'))

      // 実行
      const userId = new UserId(testDataHelpers.userId())
      const result = await repository.delete(userId)

      // 検証
      expect(result).toBe(false)
    })
  })

  describe('findActiveUsers', () => {
    it('アクティブユーザーのリストを取得する', async () => {
      // テストデータの準備
      const testUsers = [createUserTestData().build(), createUserTestData().build()]
      const prismaUsers = testUsers.map((testUser) => ({
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: testUser.displayName,
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: 'ACTIVE',
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: testUser.displayName,
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
        },
      }))

      mockPrismaClient.domainUser.findMany.mockResolvedValue(prismaUsers)

      // 実行
      const result = await repository.findActiveUsers(10, 0)

      // 検証
      expect(mockPrismaClient.domainUser.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: { nextAuthUser: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      })
      expect(result).toHaveLength(2)
      expect(result[0].getStatus().isActive()).toBe(true)
    })
  })

  describe('existsByNextAuthId', () => {
    it('NextAuthIDでユーザーの存在を確認し、trueを返す', async () => {
      // モックの設定
      mockPrismaClient.domainUser.count.mockResolvedValue(1)

      // 実行
      const nextAuthId = faker.string.uuid()
      const result = await repository.existsByNextAuthId(nextAuthId)

      // 検証
      expect(mockPrismaClient.domainUser.count).toHaveBeenCalledWith({
        where: { nextAuthId },
      })
      expect(result).toBe(true)
    })

    it('ユーザーが存在しない場合、falseを返す', async () => {
      // モックの設定
      mockPrismaClient.domainUser.count.mockResolvedValue(0)

      // 実行
      const nextAuthId = faker.string.uuid()
      const result = await repository.existsByNextAuthId(nextAuthId)

      // 検証
      expect(result).toBe(false)
    })
  })

  describe('existsByEmail', () => {
    it('メールアドレスでユーザーの存在を確認し、trueを返す', async () => {
      // モックの設定
      mockPrismaClient.domainUser.count.mockResolvedValue(1)

      // 実行
      const email = new Email(faker.internet.email())
      const result = await repository.existsByEmail(email)

      // 検証
      expect(mockPrismaClient.domainUser.count).toHaveBeenCalledWith({
        where: { email: email.getValue() },
      })
      expect(result).toBe(true)
    })
  })

  describe('countActiveUsersInPeriod', () => {
    it('指定期間内のアクティブユーザー数を取得する', async () => {
      // モックの設定
      mockPrismaClient.domainUser.count.mockResolvedValue(5)

      // 実行
      const days = 7
      const result = await repository.countActiveUsersInPeriod(days)

      // 検証
      const expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() - days)

      expect(mockPrismaClient.domainUser.count).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          lastLoginAt: {
            gte: expect.any(Date),
          },
        },
      })
      expect(result).toBe(5)
    })
  })

  describe('mapToDomainEntity', () => {
    it('デフォルト値を使用してdisplayNameを設定する', async () => {
      // テストデータの準備（displayNameがnull）
      const testUserBuilder = createUserTestData()
      const testUser = testUserBuilder.build()
      const prismaUser = {
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: null, // nullに設定
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: 'ACTIVE',
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: 'NextAuth Name', // NextAuthの名前を使用
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
        },
      }

      mockPrismaClient.domainUser.findUnique.mockResolvedValue(prismaUser)

      // 実行
      const userId = new UserId(testUser.id)
      const result = await repository.findById(userId)

      // 検証
      expect(result).not.toBeNull()
      expect(result?.getProfile().getDisplayName()).toBe('NextAuth Name')
    })

    it('非アクティブステータスを正しく処理する', async () => {
      // テストデータの準備（ステータスがDEACTIVATED）
      const testUserBuilder = createUserTestData()
      const testUser = testUserBuilder.build()
      const prismaUser = {
        id: testUser.id,
        nextAuthId: testUser.nextAuthId,
        email: testUser.email,
        displayName: testUser.displayName,
        timezone: testUser.timezone,
        preferredLanguage: testUser.language,
        theme: 'light',
        notifications: true,
        emailFrequency: 'weekly',
        status: 'DEACTIVATED', // 非アクティブに設定
        lastLoginAt: testUser.lastLoginAt,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        nextAuthUser: {
          id: testUser.nextAuthId,
          email: testUser.email,
          emailVerified: null,
          name: testUser.displayName,
          image: null,
          createdAt: testUser.createdAt,
          updatedAt: testUser.updatedAt,
        },
      }

      mockPrismaClient.domainUser.findUnique.mockResolvedValue(prismaUser)

      // 実行
      const userId = new UserId(testUser.id)
      const result = await repository.findById(userId)

      // 検証
      expect(result).not.toBeNull()
      expect(result?.getStatus().isActive()).toBe(false)
      expect(result?.getStatus().getValue()).toBe('DEACTIVATED')
    })
  })
})
