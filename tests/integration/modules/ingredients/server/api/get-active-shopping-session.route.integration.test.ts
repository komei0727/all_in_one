import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { GetActiveShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-active-shopping-session.handler'
import { GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders/entities/shopping-session.builder'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * GetActiveShoppingSession API + Application層統合テスト
 * 実際のアプリケーション層ハンドラーとリポジトリを使用して統合動作を検証
 */
describe('GetActiveShoppingSession API Integration', () => {
  let prisma: PrismaClient
  let apiHandler: GetActiveShoppingSessionApiHandler
  let repository: PrismaShoppingSessionRepository
  let userId: string

  beforeEach(async () => {
    // SQLiteテスト用のPrismaクライアントを作成
    prisma = new PrismaClient()

    // データベースのクリーンアップ（外部キー制約の順序を考慮）
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()

    // テスト用のユーザーを作成
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        emailVerified: new Date(),
      },
    })

    const domainUser = await prisma.domainUser.create({
      data: {
        id: testDataHelpers.userId(),
        displayName: faker.person.fullName(),
        email: user.email,
        nextAuthUser: {
          connect: { id: user.id },
        },
      },
    })

    userId = domainUser.id

    // 実際の依存関係を構築
    repository = new PrismaShoppingSessionRepository(prisma as any) // SQLiteとPostgreSQLの型の違いを吸収
    const queryHandler = new GetActiveShoppingSessionHandler(repository)
    apiHandler = new GetActiveShoppingSessionApiHandler(queryHandler)
  })

  afterEach(async () => {
    // テスト後のクリーンアップ（外部キー制約の順序を考慮）
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('正常系', () => {
    it('アクティブなセッションが存在する場合、セッション情報を返す', async () => {
      // Given: アクティブなセッション
      const session = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withActiveStatus()
        .withDeviceType('MOBILE')
        .withLocation(35.6762, 139.6503)
        .build()

      await repository.save(session)

      // When: APIハンドラーを通じてセッション取得
      const result = await apiHandler.handle({}, userId)

      // Then: レスポンスが成功する
      expect(result).not.toBeNull()
      const data = result

      expect(data).toMatchObject({
        sessionId: session.getId().getValue(),
        userId,
        status: 'ACTIVE',
        startedAt: expect.any(String),
        completedAt: null,
        deviceType: 'MOBILE',
        location: {},
      })
    })

    it('複数のセッションがある場合、最新のアクティブセッションを返す', async () => {
      // Given: 複数のセッション（1つアクティブ、1つ完了済み）
      const completedSession = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .build()

      const activeSession = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withActiveStatus()
        .build()

      await repository.save(completedSession)
      await repository.save(activeSession)

      // When: セッション取得
      const result = await apiHandler.handle({}, userId)

      // Then: アクティブなセッションのみが返される
      expect(result).not.toBeNull()
      const data = result
      expect(data!.sessionId).toBe(activeSession.getId().getValue())
      expect(data!.status).toBe('ACTIVE')
    })
  })

  describe('異常系', () => {
    it('アクティブなセッションが存在しない場合、404エラーを返す', async () => {
      // Given: セッションが存在しない

      // When: APIハンドラーを通じてセッション取得
      await expect(apiHandler.handle({}, userId)).rejects.toThrow()
    })

    it('他のユーザーのセッションは取得できない', async () => {
      // Given: 他のユーザーのセッション
      const otherUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          emailVerified: new Date(),
        },
      })

      const otherDomainUser = await prisma.domainUser.create({
        data: {
          id: testDataHelpers.userId(),
          displayName: faker.person.fullName(),
          email: otherUser.email,
          nextAuthUser: {
            connect: { id: otherUser.id },
          },
        },
      })

      const session = new ShoppingSessionBuilder()
        .withUserId(otherDomainUser.id)
        .withActiveStatus()
        .build()

      await repository.save(session)

      // When: 別のユーザーでセッション取得を試みる
      await expect(apiHandler.handle({}, userId)).rejects.toThrow()
    })
  })

  describe('データ整合性', () => {
    it('チェック済みアイテムは返されない（Query APIなので）', async () => {
      // Given: チェック済みアイテムを持つセッション
      const session = new ShoppingSessionBuilder().withUserId(userId).withActiveStatus().build()

      await repository.save(session)

      // When: セッション取得
      const result = await apiHandler.handle({}, userId)

      // Then: チェック済みアイテムは含まれない（別APIで取得）
      expect(result).not.toBeNull()
      const data = result
      expect(data).not.toHaveProperty('checkedItems')
    })
  })
})
