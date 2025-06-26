import { describe, it, expect, vi, beforeEach } from 'vitest'

// handlersのモック
const mockHandlers = {
  GET: vi.fn(),
  POST: vi.fn(),
}

// @/authのモック
vi.mock('@/auth', () => ({
  handlers: mockHandlers,
}))

describe('NextAuth APIルート', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('NextAuthハンドラーが正しくエクスポートされる', async () => {
    // 動的インポートで再読み込み
    const { GET, POST } = await import('@/app/api/auth/[...nextauth]/route')

    // Assert（検証）
    expect(GET).toBeDefined()
    expect(POST).toBeDefined()
    expect(GET).toBe(mockHandlers.GET)
    expect(POST).toBe(mockHandlers.POST)
  })

  it('GETリクエストのハンドラーが関数である', async () => {
    // 動的インポートで再読み込み
    const { GET } = await import('@/app/api/auth/[...nextauth]/route')

    // Assert（検証）
    expect(typeof GET).toBe('function')
  })

  it('POSTリクエストのハンドラーが関数である', async () => {
    // 動的インポートで再読み込み
    const { POST } = await import('@/app/api/auth/[...nextauth]/route')

    // Assert（検証）
    expect(typeof POST).toBe('function')
  })
})
