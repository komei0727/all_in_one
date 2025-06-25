import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Account, User } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    domainUser: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock(
  '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository',
  () => ({
    PrismaUserRepository: vi.fn().mockImplementation(() => ({
      findByNextAuthId: vi.fn(),
      save: vi.fn(),
    })),
  })
)

vi.mock('@/modules/user-authentication/server/domain/services/user-integration.service', () => ({
  UserIntegrationService: vi.fn().mockImplementation(() => ({
    createOrUpdateFromNextAuth: vi.fn(),
  })),
}))

// authOptionsをインポート
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'

describe('NextAuth設定', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本設定', () => {
    it('EmailProviderが設定されている', () => {
      // Assert（検証）
      expect(authOptions.providers).toHaveLength(1)
      expect(authOptions.providers[0].id).toBe('email')
      expect(authOptions.providers[0].type).toBe('email')
    })

    it('カスタムページが設定されている', () => {
      // Assert（検証）
      expect(authOptions.pages).toEqual({
        signIn: '/auth/login',
        signOut: '/auth/signout',
        error: '/auth/error',
        verifyRequest: '/auth/verify-request',
      })
    })

    it('セッション戦略がdatabaseに設定されている', () => {
      // Assert（検証）
      expect(authOptions.session?.strategy).toBe('database')
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60) // 30日
      expect(authOptions.session?.updateAge).toBe(24 * 60 * 60) // 24時間
    })
  })

  describe('コールバック', () => {
    describe('signInコールバック', () => {
      it('メールプロバイダーでのサインインを許可する', async () => {
        // Arrange（準備）
        const account: Partial<Account> = {
          provider: 'email',
        }

        // Act（実行）
        const result = await authOptions.callbacks!.signIn!({
          user: {} as User,
          account: account as Account,
        })

        // Assert（検証）
        expect(result).toBe(true)
      })

      it('メールプロバイダー以外でのサインインを許可する', async () => {
        // Arrange（準備）
        const account: Partial<Account> = {
          provider: 'google',
        }

        // Act（実行）
        const result = await authOptions.callbacks!.signIn!({
          user: {} as User,
          account: account as Account,
        })

        // Assert（検証）
        expect(result).toBe(true)
      })

      it('accountがnullの場合でもサインインを許可する', async () => {
        // Act（実行）
        const result = await authOptions.callbacks!.signIn!({
          user: {} as User,
          account: null,
        })

        // Assert（検証）
        expect(result).toBe(true)
      })
    })

    describe('sessionコールバック', () => {
      it('ドメインユーザー情報をセッションに追加する', async () => {
        // Arrange（準備）
        const mockDomainUser = {
          id: 'domain-user-123',
          nextAuthId: 'next-auth-123',
          status: 'ACTIVE',
          displayName: 'テストユーザー',
        }

        vi.mocked(prisma.domainUser.findUnique).mockResolvedValueOnce(mockDomainUser as any)

        const session = {
          user: {
            id: 'next-auth-123',
            email: 'test@example.com',
          },
          expires: new Date().toISOString(),
        }

        const user = {
          id: 'next-auth-123',
          email: 'test@example.com',
          emailVerified: null,
        }

        // Act（実行）
        const result = await authOptions.callbacks!.session!({
          session,
          user: user as any,
          token: {},
        } as any)

        // Assert（検証）
        expect((result.user as any)?.id).toBe('next-auth-123')
        expect((result.user as any)?.domainUserId).toBe('domain-user-123')
        expect((result.user as any)?.status).toBe('ACTIVE')
        expect((result.user as any)?.displayName).toBe('テストユーザー')
      })

      it('ドメインユーザーが存在しない場合でもセッションを返す', async () => {
        // Arrange（準備）
        vi.mocked(prisma.domainUser.findUnique).mockResolvedValueOnce(null)

        const session = {
          user: {
            id: 'next-auth-123',
            email: 'test@example.com',
          },
          expires: new Date().toISOString(),
        }

        const user = {
          id: 'next-auth-123',
          email: 'test@example.com',
          emailVerified: null,
        }

        // Act（実行）
        const result = await authOptions.callbacks!.session!({
          session,
          user: user as any,
          token: {},
        } as any)

        // Assert（検証）
        expect((result.user as any)?.id).toBe('next-auth-123')
        expect((result.user as any)?.domainUserId).toBeUndefined()
        expect((result.user as any)?.status).toBeUndefined()
        expect((result.user as any)?.displayName).toBeUndefined()
      })

      it('データベースエラーが発生してもセッションを返す', async () => {
        // Arrange（準備）
        vi.mocked(prisma.domainUser.findUnique).mockRejectedValueOnce(new Error('DB Error'))

        const session = {
          user: {
            id: 'next-auth-123',
            email: 'test@example.com',
          },
          expires: new Date().toISOString(),
        }

        const user = {
          id: 'next-auth-123',
          email: 'test@example.com',
          emailVerified: null,
        }

        // Act（実行）
        const result = await authOptions.callbacks!.session!({
          session,
          user: user as any,
          token: {},
        } as any)

        // Assert（検証）
        expect((result.user as any)?.id).toBe('next-auth-123')
        expect((result.user as any)?.domainUserId).toBeUndefined()
      })

      it('userがnullの場合はセッションをそのまま返す', async () => {
        // Arrange（準備）
        const session: any = {
          user: {
            email: 'test@example.com',
          },
          expires: new Date().toISOString(),
        }

        // Act（実行）
        const result = await authOptions.callbacks!.session!({
          session,
          user: null as any,
          token: {},
        } as any)

        // Assert（検証）
        expect(result).toEqual(session)
        expect(vi.mocked(prisma.domainUser.findUnique)).not.toHaveBeenCalled()
      })
    })

    describe('jwtコールバック', () => {
      it('ユーザー情報をトークンに追加する', async () => {
        // Arrange（準備）
        const token = { email: 'test@example.com' }
        const user = { id: 'user-123', email: 'test@example.com' }

        // Act（実行）
        const result = await authOptions.callbacks!.jwt!({
          token,
          user: user as User,
          account: null,
          profile: undefined,
          isNewUser: false,
        })

        // Assert（検証）
        expect(result.sub).toBe('user-123')
        expect(result.email).toBe('test@example.com')
      })

      it('userがない場合はトークンをそのまま返す', async () => {
        // Arrange（準備）
        const token = { sub: 'existing-id', email: 'test@example.com' }

        // Act（実行）
        const result = await authOptions.callbacks!.jwt!({
          token,
          user: undefined as any,
          account: null,
          profile: undefined,
          isNewUser: false,
        })

        // Assert（検証）
        expect(result).toEqual(token)
      })
    })
  })

  describe('イベント', () => {
    describe('signInイベント', () => {
      it('メールプロバイダーでのサインイン時にドメインユーザーを作成/更新する', async () => {
        // Arrange（準備）
        const mockCreateOrUpdate = vi.fn()
        vi.mocked(UserIntegrationService).mockImplementation(
          () =>
            ({
              createOrUpdateFromNextAuth: mockCreateOrUpdate,
            }) as any
        )

        const message = {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'テストユーザー',
            image: 'https://example.com/avatar.jpg',
          },
          account: {
            provider: 'email',
          },
        }

        // Act（実行）
        await authOptions.events!.signIn!(message as any)

        // Assert（検証）
        expect(mockCreateOrUpdate).toHaveBeenCalledWith({
          id: 'user-123',
          email: 'test@example.com',
          name: 'テストユーザー',
          image: 'https://example.com/avatar.jpg',
          emailVerified: null,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      })

      it('メールプロバイダー以外のサインインでは処理をスキップする', async () => {
        // Arrange（準備）
        const mockCreateOrUpdate = vi.fn()
        vi.mocked(UserIntegrationService).mockImplementation(
          () =>
            ({
              createOrUpdateFromNextAuth: mockCreateOrUpdate,
            }) as any
        )

        const message = {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
          account: {
            provider: 'google',
          },
        }

        // Act（実行）
        await authOptions.events!.signIn!(message as any)

        // Assert（検証）
        expect(mockCreateOrUpdate).not.toHaveBeenCalled()
      })

      it('ドメインユーザー作成時のエラーを適切に処理する', async () => {
        // Arrange（準備）
        const mockCreateOrUpdate = vi.fn().mockRejectedValueOnce(new Error('作成エラー'))
        vi.mocked(UserIntegrationService).mockImplementation(
          () =>
            ({
              createOrUpdateFromNextAuth: mockCreateOrUpdate,
            }) as any
        )

        const message = {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
          account: {
            provider: 'email',
          },
        }

        // Act & Assert（実行 & 検証）
        // エラーが発生してもイベント処理は正常に完了する
        await expect(authOptions.events!.signIn!(message as any)).resolves.not.toThrow()
      })
    })

    describe('createUserイベント', () => {
      it('createUserイベントが定義されている', () => {
        // Assert（検証）
        expect(authOptions.events!.createUser).toBeDefined()
      })
    })
  })
})
