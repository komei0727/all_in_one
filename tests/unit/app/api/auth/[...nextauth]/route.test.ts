import { describe, it, expect, vi, beforeEach } from 'vitest'

// NextAuthのモック
const mockNextAuth = vi.fn()
vi.mock('next-auth', () => ({
  default: mockNextAuth,
}))

// authOptionsのモック
vi.mock('@/lib/auth', () => ({
  authOptions: {
    providers: [],
    callbacks: {},
  },
}))

describe('NextAuth APIルート', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('NextAuthハンドラーが正しく初期化される', async () => {
    // Arrange（準備）
    const mockHandler = vi.fn()
    mockNextAuth.mockReturnValue(mockHandler)

    // モジュールキャッシュをクリア
    vi.resetModules()

    // 動的インポートで再読み込み
    const { GET, POST } = await import('@/app/api/auth/[...nextauth]/route')

    // Assert（検証）
    expect(mockNextAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        providers: expect.any(Array),
        callbacks: expect.any(Object),
      })
    )
    expect(GET).toBeDefined()
    expect(POST).toBeDefined()
    expect(GET).toBe(POST) // 同じハンドラーを使用
  })

  it('GETリクエストのハンドラーが関数である', async () => {
    // Arrange（準備）
    const mockHandler = vi.fn()
    mockNextAuth.mockReturnValue(mockHandler)

    // モジュールキャッシュをクリア
    vi.resetModules()

    // 動的インポートで再読み込み
    const { GET } = await import('@/app/api/auth/[...nextauth]/route')

    // Assert（検証）
    expect(typeof GET).toBe('function')
    expect(mockNextAuth).toHaveBeenCalledTimes(1)
  })

  it('POSTリクエストのハンドラーが関数である', async () => {
    // Arrange（準備）
    const mockHandler = vi.fn()
    mockNextAuth.mockReturnValue(mockHandler)

    // モジュールキャッシュをクリア
    vi.resetModules()

    // 動的インポートで再読み込み
    const { POST } = await import('@/app/api/auth/[...nextauth]/route')

    // Assert（検証）
    expect(typeof POST).toBe('function')
    expect(mockNextAuth).toHaveBeenCalledTimes(1)
  })
})
