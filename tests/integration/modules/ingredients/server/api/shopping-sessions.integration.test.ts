import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as complete } from '@/app/api/v1/shopping-sessions/[sessionId]/complete/route'
import { GET as getActive } from '@/app/api/v1/shopping-sessions/active/route'
import { POST as startSession } from '@/app/api/v1/shopping-sessions/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '@tests/helpers/database.helper'

// @/auth はvitest configでモック済み

/**
 * テスト用認証ユーザーのモックを設定
 */
function mockAuthUser(user?: { nextAuthId?: string; domainUserId?: string; email?: string }) {
  const testDataIds = getTestDataIds()
  const { defaultUser } = testDataIds.users

  vi.mocked(auth).mockResolvedValue({
    user: {
      id: user?.nextAuthId || defaultUser.nextAuthId,
      email: user?.email || defaultUser.email,
      domainUserId: user?.domainUserId || defaultUser.domainUserId,
    },
  } as any)

  return user?.domainUserId || defaultUser.domainUserId
}

describe('Shopping Sessions API Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let testUserId: string

  beforeEach(async () => {
    // テストデータベースをセットアップ
    await setupIntegrationTest()

    // テスト用のPrismaクライアントを取得
    prisma = getTestPrismaClient()

    // CompositionRootをリセット
    vi.spyOn(CompositionRoot, 'getInstance').mockReturnValue(new CompositionRoot(prisma as any))

    // テストユーザーIDを取得
    testUserId = mockAuthUser()
  })

  afterEach(async () => {
    // データベースをクリーンアップ
    await cleanupIntegrationTest()
    vi.clearAllMocks()
  })

  afterAll(async () => {
    // Prismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('セッション管理フロー', () => {
    it('新しいセッションを開始し、取得し、完了できる', async () => {
      // 1. 新しいセッションを開始
      const startRequest = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: testUserId }),
      })

      const startResponse = await startSession(startRequest)
      expect(startResponse.status).toBe(201)

      const startData = await startResponse.json()
      expect(startData).toMatchObject({
        userId: testUserId,
        status: 'ACTIVE',
        startedAt: expect.any(String),
        completedAt: null,
      })
      const sessionId = startData.sessionId

      // 2. アクティブなセッションを取得
      const getActiveRequest = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/active?userId=${testUserId}`
      )

      const getActiveResponse = await getActive(getActiveRequest)
      expect(getActiveResponse.status).toBe(200)

      const activeData = await getActiveResponse.json()
      expect(activeData).toMatchObject({
        sessionId,
        userId: testUserId,
        status: 'ACTIVE',
      })

      // 3. セッションを完了
      const completeRequest = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: testUserId }),
        }
      )

      const completeResponse = await complete(completeRequest, {
        params: { sessionId },
      })
      expect(completeResponse.status).toBe(200)

      const completeData = await completeResponse.json()
      expect(completeData).toMatchObject({
        sessionId,
        userId: testUserId,
        status: 'COMPLETED',
        completedAt: expect.any(String),
      })

      // 4. 完了後はアクティブなセッションが存在しない
      const getActiveAgainRequest = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/active?userId=${testUserId}`
      )

      const getActiveAgainResponse = await getActive(getActiveAgainRequest)
      expect(getActiveAgainResponse.status).toBe(404)
    })

    it('同じユーザーで複数のアクティブセッションを作成できない', async () => {
      // 1つ目のセッションを開始
      const firstRequest = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: testUserId }),
      })

      const firstResponse = await startSession(firstRequest)
      expect(firstResponse.status).toBe(201)

      // 2つ目のセッションを開始しようとする
      const secondRequest = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: testUserId }),
      })

      const secondResponse = await startSession(secondRequest)
      expect(secondResponse.status).toBe(409)

      const errorData = await secondResponse.json()
      expect(errorData.error).toContain('同一ユーザーで同時にアクティブなセッションは1つのみです')
    })

    it('他のユーザーのセッションを完了できない', async () => {
      // セッションを開始
      const startRequest = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: testUserId }),
      })

      const startResponse = await startSession(startRequest)
      expect(startResponse.status).toBe(201)
      const { sessionId } = await startResponse.json()

      // 別のユーザーを作成
      const otherNextAuthId = faker.string.uuid()
      const otherDomainUserId = testDataHelpers.userId()
      const otherEmail = faker.internet.email()

      await prisma.user.create({
        data: {
          id: otherNextAuthId,
          email: otherEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      await prisma.domainUser.create({
        data: {
          id: otherDomainUserId,
          nextAuthId: otherNextAuthId,
          email: otherEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const otherUserId = otherDomainUserId

      // 別のユーザーとしてセッションを完了しようとする
      const completeRequest = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: otherUserId }),
        }
      )

      const completeResponse = await complete(completeRequest, {
        params: { sessionId },
      })
      expect(completeResponse.status).toBe(403)

      const errorData = await completeResponse.json()
      expect(errorData.error).toContain('権限がありません')
    })
  })

  describe('エラーケース', () => {
    it('存在しないセッションを取得しようとすると404エラー', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/active?userId=${testUserId}`
      )

      const response = await getActive(request)
      expect(response.status).toBe(404)
    })

    it('存在しないセッションを完了しようとすると404エラー', async () => {
      const { ShoppingSessionId } = await import(
        '@/modules/ingredients/server/domain/value-objects'
      )
      const nonExistentSessionId = ShoppingSessionId.create().getValue()
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${nonExistentSessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: testUserId }),
        }
      )

      const response = await complete(request, {
        params: { sessionId: nonExistentSessionId },
      })
      expect(response.status).toBe(404)
    })
  })
})
