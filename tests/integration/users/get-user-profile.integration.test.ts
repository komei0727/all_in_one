import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/users/me/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
  createTestUser,
} from '@tests/helpers/database.helper'

// authモジュールをモック
vi.mock('@/auth')

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

/**
 * GET /api/v1/users/me APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/users/me Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // CompositionRootをリセットして、テスト用のPrismaクライアントを使用
    CompositionRoot.resetInstance()
    CompositionRoot.getInstance(prisma as any)

    // 認証モックのリセット
    vi.mocked(auth).mockReset()
  })

  afterEach(async () => {
    // 各テストの後にクリーンアップ
    await cleanupIntegrationTest()
    vi.clearAllMocks()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントをクリーンアップ
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    describe('基本的なプロフィール取得', () => {
      it('TC001: 認証済みユーザーのプロフィール取得', async () => {
        // Given: 認証済みユーザーとドメインユーザーが存在
        const testDataIds = getTestDataIds()
        const domainUserId = mockAuthUser()

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: 正常なレスポンスが返される
        expect(response.status).toBe(200)
        const data = await response.json()

        // レスポンス形式の検証
        expect(data).toHaveProperty('data')
        expect(data).toHaveProperty('meta')
        expect(data.meta).toHaveProperty('timestamp')
        expect(data.meta).toHaveProperty('version')

        // 全フィールドの存在確認
        const user = data.data
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('status')
        expect(user).toHaveProperty('profile')
        expect(user.profile).toHaveProperty('displayName')
        expect(user.profile).toHaveProperty('timezone')
        expect(user.profile).toHaveProperty('language')
        expect(user).toHaveProperty('createdAt')
        expect(user).toHaveProperty('updatedAt')
        expect(user).toHaveProperty('lastLoginAt')

        // 値の確認
        expect(user.id).toBe(domainUserId)
        expect(user.email).toBe(testDataIds.users.defaultUser.email)
        expect(user.status).toBe('ACTIVE')
      })

      it('TC002: プロフィール情報の構造確認', async () => {
        // Given: 認証済みユーザーが存在
        mockAuthUser()

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: プロフィール構造が正しい
        const data = await response.json()
        const user = data.data

        // プロフィールフィールドの確認
        expect(user.profile).toBeDefined()
        expect(user.profile.displayName).toBeDefined()
        expect(user.profile.timezone).toBeDefined()
        expect(user.profile.language).toBeDefined()

        // タイムスタンプ形式の検証
        expect(new Date(user.createdAt)).toBeInstanceOf(Date)
        expect(new Date(user.updatedAt)).toBeInstanceOf(Date)
        if (user.lastLoginAt) {
          expect(new Date(user.lastLoginAt)).toBeInstanceOf(Date)
        }
      })

      it('TC003: デフォルト値の確認', async () => {
        // Given: 新規作成されたユーザー
        const newUser = await createTestUser({
          email: faker.internet.email(),
        })
        mockAuthUser({
          nextAuthId: newUser.nextAuthId,
          domainUserId: newUser.domainUserId,
          email: newUser.email,
        })

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: デフォルト値が設定されている
        const data = await response.json()
        const user = data.data

        expect(user.profile.timezone).toBe('Asia/Tokyo')
        expect(user.profile.language).toBe('ja')
        // displayNameはデフォルトで"Test User"
        expect(user.profile.displayName).toBe('Test User')
      })
    })

    describe('ユーザーステータス別の取得', () => {
      it('TC004: ACTIVEステータスのユーザー', async () => {
        // Given: アクティブなユーザー
        mockAuthUser()

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: 正常なレスポンスが返される
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.data.status).toBe('ACTIVE')
      })

      it('TC005: DEACTIVATEDステータスのユーザー', async () => {
        // Given: 無効化されたユーザー
        const domainUserId = mockAuthUser()

        // ユーザーを無効化
        await prisma.domainUser.update({
          where: { id: domainUserId },
          data: { status: 'DEACTIVATED' },
        })

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: プロフィール取得は可能でステータスがDEACTIVATED
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.data.status).toBe('DEACTIVATED')
      })
    })
  })

  describe('異常系', () => {
    describe('認証エラー', () => {
      it('TC101: 認証されていない場合（401エラー）', async () => {
        // Given: 認証されていないユーザー
        vi.mocked(auth).mockResolvedValue(null as any)

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: 401エラーが返される
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error.code).toBe('UNAUTHORIZED')
        expect(data.error.message).toBe('認証が必要です')
      })

      it('TC102: 無効なセッション（401エラー）', async () => {
        // Given: セッションは存在するがuserがnull
        vi.mocked(auth).mockResolvedValue({ user: null } as any)

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: 401エラーが返される
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error.code).toBe('UNAUTHORIZED')
      })

      it('TC103: domainUserIdがない場合（401エラー）', async () => {
        // Given: NextAuthユーザーは存在するがdomainUserIdがない
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            // domainUserIdが存在しない
          },
        } as any)

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: 401エラーが返される
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error.code).toBe('UNAUTHORIZED')
        expect(data.error.message).toBe('認証が必要です')
      })
    })

    describe('ドメインユーザー不存在', () => {
      it('TC201: ドメインユーザーが見つからない（400エラー）', async () => {
        // Given: 存在しないdomainUserIdを持つ認証ユーザー
        const nonExistentUserId = faker.string.uuid()
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            domainUserId: nonExistentUserId,
          },
        } as any)

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: 400エラーが返される（バリデーションエラーとして扱われる）
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain('ユーザーIDはusr_で始まる必要があります')
      })
    })
  })

  describe('データ整合性', () => {
    describe('NextAuthとの統合', () => {
      it('TC301: メールアドレスの同期確認', async () => {
        // Given: NextAuthとドメインユーザーのメールアドレスが一致
        const testDataIds = getTestDataIds()
        const email = testDataIds.users.defaultUser.email
        mockAuthUser()

        // When: プロフィール取得APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me')
        const response = await GET(request)

        // Then: メールアドレスが一致している
        const data = await response.json()
        expect(data.data.email).toBe(email)
      })
    })
  })

  describe('メタ情報の検証', () => {
    it('TC001: timestampフィールド', async () => {
      // Given: 認証済みユーザー
      mockAuthUser()

      // When: プロフィール取得APIを呼び出す
      const request = new NextRequest('http://localhost:3000/api/v1/users/me')
      const response = await GET(request)

      // Then: timestampがISO 8601形式
      const data = await response.json()
      expect(data.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)

      // サーバー時刻との差が1秒以内
      const serverTime = new Date()
      const responseTime = new Date(data.meta.timestamp)
      expect(Math.abs(serverTime.getTime() - responseTime.getTime())).toBeLessThan(1000)
    })

    it('TC002: versionフィールド', async () => {
      // Given: 認証済みユーザー
      mockAuthUser()

      // When: プロフィール取得APIを呼び出す
      const request = new NextRequest('http://localhost:3000/api/v1/users/me')
      const response = await GET(request)

      // Then: versionが適切な形式
      const data = await response.json()
      expect(data.meta.version).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('エラーレスポンス', () => {
    it('TC001: エラーレスポンス構造', async () => {
      // Given: 認証されていないユーザー
      vi.mocked(auth).mockResolvedValue(null as any)

      // When: プロフィール取得APIを呼び出す
      const request = new NextRequest('http://localhost:3000/api/v1/users/me')
      const response = await GET(request)

      // Then: エラーレスポンスが適切な構造
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
      expect(data.error).toHaveProperty('type')
      expect(data).toHaveProperty('meta')
      expect(data.meta).toHaveProperty('timestamp')
      expect(data.meta).toHaveProperty('correlationId')
    })

    it('TC002: correlationIdの一意性', async () => {
      // Given: 認証されていないユーザー
      vi.mocked(auth).mockResolvedValue(null as any)

      // When: 2回エラーを発生させる
      const request1 = new NextRequest('http://localhost:3000/api/v1/users/me')
      const response1 = await GET(request1)
      const data1 = await response1.json()

      const request2 = new NextRequest('http://localhost:3000/api/v1/users/me')
      const response2 = await GET(request2)
      const data2 = await response2.json()

      // Then: correlationIdが異なる
      expect(data1.meta.correlationId).toBeDefined()
      expect(data2.meta.correlationId).toBeDefined()
      expect(data1.meta.correlationId).not.toBe(data2.meta.correlationId)

      // correlationIdは一意であればよい
      // UUID形式ではなく、カスタム形式を使用
      expect(data1.meta.correlationId).toMatch(/^req_\d+_[a-z0-9]+$/)
    })
  })
})
