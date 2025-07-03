import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { PUT } from '@/app/api/v1/users/me/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
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
 * PUT /api/v1/users/me APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('PUT /api/v1/users/me Integration Tests', () => {
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
    describe('基本的なプロフィール更新', () => {
      it('TC001: 全プロフィールフィールドの更新', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const updateData = {
          displayName: faker.person.fullName(),
          timezone: 'America/New_York',
          language: 'en' as const,
        }

        // When: プロフィール更新APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })
        const response = await PUT(request)

        // Then: 正常なレスポンスが返される
        expect(response.status).toBe(200)
        const data = await response.json()

        // 更新されたデータの確認
        expect(data.data.profile.displayName).toBe(updateData.displayName)
        expect(data.data.profile.timezone).toBe(updateData.timezone)
        expect(data.data.profile.language).toBe(updateData.language)

        // updatedAtが更新されている
        const updatedUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })
        expect(new Date(data.data.updatedAt)).toEqual(updatedUser?.updatedAt)
      })

      it('TC002: 各フィールドの個別更新', async () => {
        // Given: 認証済みユーザーと初期データ
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // displayNameの更新（他のフィールドは既存値を維持）
        const updateData1 = {
          displayName: faker.person.fullName(),
          timezone: initialUser?.timezone || 'Asia/Tokyo',
          language: (initialUser?.preferredLanguage || 'ja') as 'ja' | 'en',
        }
        const request1 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData1),
        })
        const response1 = await PUT(request1)
        expect(response1.status).toBe(200)
        const data1 = await response1.json()
        expect(data1.data.profile.displayName).toBe(updateData1.displayName)
        expect(data1.data.profile.timezone).toBe(initialUser?.timezone)
        expect(data1.data.profile.language).toBe(initialUser?.preferredLanguage || 'ja')

        // timezoneの更新（他のフィールドは前回の値を維持）
        const updateData2 = {
          displayName: updateData1.displayName,
          timezone: 'Europe/London',
          language: (initialUser?.preferredLanguage || 'ja') as 'ja' | 'en',
        }
        const request2 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData2),
        })
        const response2 = await PUT(request2)
        expect(response2.status).toBe(200)
        const data2 = await response2.json()
        expect(data2.data.profile.displayName).toBe(updateData1.displayName) // 前回の更新が保持
        expect(data2.data.profile.timezone).toBe(updateData2.timezone)
        expect(data2.data.profile.language).toBe(initialUser?.preferredLanguage || 'ja')

        // languageの更新（他のフィールドは前回の値を維持）
        const updateData3 = {
          displayName: updateData1.displayName,
          timezone: updateData2.timezone,
          language: 'en' as const,
        }
        const request3 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData3),
        })
        const response3 = await PUT(request3)
        expect(response3.status).toBe(200)
        const data3 = await response3.json()
        expect(data3.data.profile.displayName).toBe(updateData1.displayName)
        expect(data3.data.profile.timezone).toBe(updateData2.timezone)
        expect(data3.data.profile.language).toBe(updateData3.language)
      })
    })

    describe('フィールド別の更新パターン', () => {
      it('TC004: displayNameの更新パターン', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // 日本語名
        const japaneseName = '山田太郎'
        const request1 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: japaneseName,
            timezone: initialUser?.timezone || 'Asia/Tokyo',
            language: initialUser?.preferredLanguage || 'ja',
          }),
        })
        const response1 = await PUT(request1)
        expect(response1.status).toBe(200)
        const data1 = await response1.json()
        expect(data1.data.profile.displayName).toBe(japaneseName)

        // 英語名
        const englishName = 'Taro Yamada'
        const request2 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: englishName,
            timezone: initialUser?.timezone || 'Asia/Tokyo',
            language: initialUser?.preferredLanguage || 'ja',
          }),
        })
        const response2 = await PUT(request2)
        expect(response2.status).toBe(200)
        const data2 = await response2.json()
        expect(data2.data.profile.displayName).toBe(englishName)

        // 最大長（100文字）のテスト（バリデーターの最大長に合わせて修正）
        const maxLengthName = 'あ'.repeat(100)
        const request3 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: maxLengthName,
            timezone: initialUser?.timezone || 'Asia/Tokyo',
            language: initialUser?.preferredLanguage || 'ja',
          }),
        })
        const response3 = await PUT(request3)
        expect(response3.status).toBe(200)
        const data3 = await response3.json()
        expect(data3.data.profile.displayName).toBe(maxLengthName)
      })

      it('TC005: タイムゾーンの更新', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // 有効なIANAタイムゾーン各種
        const timezones = [
          'Asia/Tokyo',
          'Europe/London',
          'America/New_York',
          'America/Los_Angeles',
          'Australia/Sydney',
        ]

        for (const timezone of timezones) {
          const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              displayName: initialUser?.displayName || 'Test User',
              timezone,
              language: initialUser?.preferredLanguage || 'ja',
            }),
          })
          const response = await PUT(request)
          expect(response.status).toBe(200)
          const data = await response.json()
          expect(data.data.profile.timezone).toBe(timezone)
        }
      })

      it('TC006: 言語設定の更新', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // ja → en
        const request1 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: initialUser?.displayName || 'Test User',
            timezone: initialUser?.timezone || 'Asia/Tokyo',
            language: 'en',
          }),
        })
        const response1 = await PUT(request1)
        expect(response1.status).toBe(200)
        const data1 = await response1.json()
        expect(data1.data.profile.language).toBe('en')

        // en → ja
        const request2 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: initialUser?.displayName || 'Test User',
            timezone: initialUser?.timezone || 'Asia/Tokyo',
            language: 'ja',
          }),
        })
        const response2 = await PUT(request2)
        expect(response2.status).toBe(200)
        const data2 = await response2.json()
        expect(data2.data.profile.language).toBe('ja')
      })
    })
  })

  describe('異常系', () => {
    describe('バリデーションエラー', () => {
      it('TC101: displayNameの制約違反（400エラー）', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // 101文字以上
        const longName = 'あ'.repeat(101)
        const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: longName,
            timezone: initialUser?.timezone || 'Asia/Tokyo',
            language: initialUser?.preferredLanguage || 'ja',
          }),
        })
        const response = await PUT(request)

        // Then: 400エラー
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain('Validation failed')
      })

      it('TC102: 無効なタイムゾーン（400エラー）', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // When: 無効なタイムゾーンで更新
        const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: initialUser?.displayName || 'Test User',
            timezone: 'Invalid/Timezone',
            language: initialUser?.preferredLanguage || 'ja',
          }),
        })
        const response = await PUT(request)

        // Then: 400エラー
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain('無効なタイムゾーンです')
      })

      it('TC103: サポートされていない言語（400エラー）', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // When: サポートされていない言語で更新
        const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: initialUser?.displayName || 'Test User',
            timezone: initialUser?.timezone || 'Asia/Tokyo',
            language: 'xx',
          }),
        })
        const response = await PUT(request)

        // Then: 400エラー
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain('Validation failed')
      })

      it('TC104: 必須フィールドの欠落（400エラー）', async () => {
        // Given: 認証済みユーザー
        mockAuthUser()

        // When: 必須フィールドが欠けたリクエスト
        const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // 空のボディ
        })
        const response = await PUT(request)

        // Then: 400エラー
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('認証・認可エラー', () => {
      it('TC201: 認証されていない場合（401エラー）', async () => {
        // Given: 認証されていないユーザー
        vi.mocked(auth).mockResolvedValue(null as any)

        // When: プロフィール更新APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ displayName: 'テスト', timezone: 'Asia/Tokyo', language: 'ja' }),
        })
        const response = await PUT(request)

        // Then: 401エラー
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error.code).toBe('UNAUTHORIZED')
      })

      it('TC202: ドメインユーザーが見つからない（400エラー）', async () => {
        // Given: 存在しないdomainUserIdを持つ認証ユーザー
        const nonExistentUserId = faker.string.uuid()
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            domainUserId: nonExistentUserId,
          },
        } as any)

        // When: プロフィール更新APIを呼び出す
        const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ displayName: 'テスト', timezone: 'Asia/Tokyo', language: 'ja' }),
        })
        const response = await PUT(request)

        // Then: 400エラー
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })
    })
  })

  describe('並行性', () => {
    describe('同時更新', () => {
      it('TC301: 同じユーザーの同時更新', async () => {
        // Given: 認証済みユーザー
        const domainUserId = mockAuthUser()
        const initialUser = await prisma.domainUser.findUnique({
          where: { id: domainUserId },
        })

        // When: 2つの異なる更新リクエストを並行実行
        const updateData1 = {
          displayName: '更新1',
          timezone: initialUser?.timezone || 'Asia/Tokyo',
          language: (initialUser?.preferredLanguage || 'ja') as 'ja' | 'en',
        }
        const updateData2 = {
          displayName: '更新2',
          timezone: initialUser?.timezone || 'Asia/Tokyo',
          language: (initialUser?.preferredLanguage || 'ja') as 'ja' | 'en',
        }

        const request1 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData1),
        })

        const request2 = new NextRequest('http://localhost:3000/api/v1/users/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData2),
        })

        // 並行実行
        const [response1, response2] = await Promise.all([PUT(request1), PUT(request2)])

        // Then: 両方とも成功し、データ不整合が発生しない
        expect(response1.status).toBe(200)
        expect(response2.status).toBe(200)

        const data1 = await response1.json()
        const data2 = await response2.json()

        // 少なくとも一方の更新が反映されている
        const displayNames = [data1.data.profile.displayName, data2.data.profile.displayName]
        expect(displayNames).toContain('更新1')
        expect(displayNames).toContain('更新2')
      })
    })
  })

  describe('不正なリクエスト', () => {
    it('不正なJSON', async () => {
      // Given: 認証済みユーザー
      mockAuthUser()

      // When: 不正なJSONを送信
      const request = new NextRequest('http://localhost:3000/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{ invalid json',
      })
      const response = await PUT(request)

      // Then: エラーレスポンス
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR')
    })
  })
})
