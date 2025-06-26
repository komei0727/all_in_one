import { NextRequest, NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// モッククラス - アプリケーションサービス
const mockUserApplicationService = {
  getUserByNextAuthId: vi.fn(),
  updateUserProfile: vi.fn(),
}

// モッククラス - APIハンドラー
const mockProfileApiHandler = {
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}

// モック設定
vi.mock(
  '@/modules/user-authentication/server/application/services/user-application.service',
  () => ({
    UserApplicationService: vi.fn().mockImplementation(() => mockUserApplicationService),
  })
)

vi.mock('@/modules/user-authentication/server/api/handlers/profile-handler', () => ({
  ProfileApiHandler: vi.fn().mockImplementation(() => mockProfileApiHandler),
}))

vi.mock('@/modules/user-authentication/server/api/error-handler', () => ({
  ApiErrorHandler: {
    unauthorizedError: vi.fn(),
    handleError: vi.fn(),
  },
}))

// テスト対象のAPIハンドラーをインポート（モック設定後）
import { GET, PUT } from '@/app/api/auth/user/profile/route'
import { auth } from '@/auth'
import { ApiErrorHandler } from '@/modules/user-authentication/server/api/error-handler'

describe('User Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // エラーハンドラーのモック実装をセットアップ
    vi.mocked(ApiErrorHandler.unauthorizedError).mockReturnValue(
      NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'ログインが必要です',
        },
        { status: 401 }
      )
    )

    vi.mocked(ApiErrorHandler.handleError).mockImplementation((error: unknown) => {
      if (error instanceof Error && error.message === 'ユーザーが見つかりません') {
        return NextResponse.json(
          {
            error: 'User not found',
            message: 'ユーザーが見つかりません',
          },
          { status: 404 }
        )
      }
      if (error instanceof Error && error.message === '表示名は必須です') {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: '表示名は必須です',
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: '処理中にエラーが発生しました',
        },
        { status: 500 }
      )
    })
  })

  describe('GET /api/auth/user/profile', () => {
    it('認証済みユーザーのプロフィールを取得できる', async () => {
      // Arrange（準備）
      const session = {
        user: {
          id: 'next-auth-123',
          email: 'test@example.com',
        },
      }

      const userProfile = {
        id: 'user-123',
        nextAuthId: 'next-auth-123',
        email: 'test@example.com',
        profile: {
          displayName: 'テストユーザー',
          timezone: 'Asia/Tokyo',
          language: 'ja',
          preferences: {
            theme: 'light',
            notifications: true,
            emailFrequency: 'weekly',
          },
        },
        status: 'ACTIVE',
        isActive: true,
        lastLoginAt: new Date('2024-01-01T10:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      }

      vi.mocked(auth).mockResolvedValue(session as any)
      mockProfileApiHandler.getProfile.mockResolvedValue(userProfile)

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile')
      const response = await GET(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(200)
      expect(data.user.email).toBe('test@example.com')
      expect(data.user.profile.displayName).toBe('テストユーザー')
      expect(data.user.profile.language).toBe('ja')
      expect(mockProfileApiHandler.getProfile).toHaveBeenCalledWith('next-auth-123')
    })

    it('未認証の場合は401エラーを返す', async () => {
      // Arrange（準備）
      vi.mocked(auth).mockResolvedValue(null as any)

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile')
      const response = await GET(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('ログインが必要です')
    })

    it('ユーザーが見つからない場合は404エラーを返す', async () => {
      // Arrange（準備）
      const session = {
        user: {
          id: 'next-auth-123',
          email: 'test@example.com',
        },
      }

      vi.mocked(auth).mockResolvedValue(session as any)
      mockProfileApiHandler.getProfile.mockRejectedValue(new Error('ユーザーが見つかりません'))

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile')
      const response = await GET(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
      expect(data.message).toBe('ユーザーが見つかりません')
    })

    it('サーバーエラーの場合は500エラーを返す', async () => {
      // Arrange（準備）
      const session = {
        user: {
          id: 'next-auth-123',
          email: 'test@example.com',
        },
      }

      vi.mocked(auth).mockResolvedValue(session as any)
      mockProfileApiHandler.getProfile.mockRejectedValue(new Error('Database error'))

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile')
      const response = await GET(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.message).toBe('処理中にエラーが発生しました')
    })
  })

  describe('PUT /api/auth/user/profile', () => {
    it('認証済みユーザーのプロフィールを更新できる', async () => {
      // Arrange（準備）
      const session = {
        user: {
          id: 'next-auth-123',
          email: 'test@example.com',
        },
      }

      const requestBody = {
        displayName: '更新されたユーザー',
        timezone: 'America/New_York',
        language: 'en',
      }

      const updatedProfile = {
        id: 'user-123',
        nextAuthId: 'next-auth-123',
        email: 'test@example.com',
        profile: {
          displayName: '更新されたユーザー',
          timezone: 'America/New_York',
          language: 'en',
          preferences: {
            theme: 'light',
            notifications: true,
            emailFrequency: 'weekly',
          },
        },
        status: 'ACTIVE',
        isActive: true,
        lastLoginAt: new Date('2024-01-01T10:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T11:00:00Z'),
      }

      vi.mocked(auth).mockResolvedValue(session as any)
      mockProfileApiHandler.updateProfile.mockResolvedValue(updatedProfile)

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const response = await PUT(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(200)
      expect(data.user.profile.displayName).toBe('更新されたユーザー')
      expect(data.user.profile.language).toBe('en')
      expect(data.message).toBe('プロフィールが更新されました')
      expect(mockProfileApiHandler.updateProfile).toHaveBeenCalledWith('next-auth-123', requestBody)
    })

    it('未認証の場合は401エラーを返す', async () => {
      // Arrange（準備）
      vi.mocked(auth).mockResolvedValue(null as any)

      const requestBody = {
        displayName: '更新されたユーザー',
        timezone: 'America/New_York',
        language: 'en',
      }

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const response = await PUT(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('ログインが必要です')
    })

    it('無効なリクエストボディの場合は400エラーを返す', async () => {
      // Arrange（準備）
      const session = {
        user: {
          id: 'next-auth-123',
          email: 'test@example.com',
        },
      }

      const invalidRequestBody = {
        displayName: '', // 無効な値
        timezone: 'America/New_York',
        language: 'en',
      }

      vi.mocked(auth).mockResolvedValue(session as any)
      mockProfileApiHandler.updateProfile.mockRejectedValue(new Error('表示名は必須です'))

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile', {
        method: 'PUT',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const response = await PUT(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation error')
      expect(data.message).toBe('表示名は必須です')
    })

    it('JSONパースエラーの場合は400エラーを返す', async () => {
      // Arrange（準備）
      const session = {
        user: {
          id: 'next-auth-123',
          email: 'test@example.com',
        },
      }

      vi.mocked(auth).mockResolvedValue(session as any)

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile', {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const response = await PUT(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.message).toBe('リクエストボディが無効です')
    })

    it('サーバーエラーの場合は500エラーを返す', async () => {
      // Arrange（準備）
      const session = {
        user: {
          id: 'next-auth-123',
          email: 'test@example.com',
        },
      }

      const requestBody = {
        displayName: '更新されたユーザー',
        timezone: 'America/New_York',
        language: 'en',
      }

      vi.mocked(auth).mockResolvedValue(session as any)
      mockProfileApiHandler.updateProfile.mockRejectedValue(new Error('Database connection failed'))

      // Act（実行）
      const request = new NextRequest('http://localhost:3000/api/auth/user/profile', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const response = await PUT(request)
      const data = await response.json()

      // Assert（検証）
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.message).toBe('処理中にエラーが発生しました')
    })
  })
})
