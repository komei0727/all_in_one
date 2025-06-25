import { describe, it, expect } from 'vitest'

import { UserCreatedFromNextAuthEvent } from '@/modules/user-authentication/server/domain/events/user-created-from-nextauth.event'

describe('UserCreatedFromNextAuthEvent', () => {
  // NextAuthユーザーから作成されたイベントのテスト
  it('イベントを正しく作成できる', () => {
    const aggregateId = 'user_123'
    const nextAuthId = 'nextauth_456'
    const email = 'test@example.com'
    const displayName = 'Test User'

    const event = new UserCreatedFromNextAuthEvent(
      aggregateId,
      nextAuthId,
      email,
      displayName,
      true
    )

    expect(event.aggregateId).toBe(aggregateId)
    expect(event.nextAuthId).toBe(nextAuthId)
    expect(event.email).toBe(email)
    expect(event.displayName).toBe(displayName)
    expect(event.isFirstTime).toBe(true)
  })

  // イベント名の確認
  it('正しいイベント名を返す', () => {
    const event = new UserCreatedFromNextAuthEvent(
      'user_123',
      'nextauth_456',
      'test@example.com',
      'Test User'
    )

    expect(event.eventName).toBe('user.createdFromNextAuth')
  })

  // JSON変換のテスト
  it('正しくJSON形式に変換できる', () => {
    const event = new UserCreatedFromNextAuthEvent(
      'user_123',
      'nextauth_456',
      'test@example.com',
      'Test User',
      false
    )

    const json = event.toJSON()

    expect(json).toMatchObject({
      id: expect.any(String),
      eventName: 'user.createdFromNextAuth',
      aggregateId: 'user_123',
      version: 1,
      occurredAt: expect.any(String),
      payload: {
        nextAuthId: 'nextauth_456',
        email: 'test@example.com',
        displayName: 'Test User',
        isFirstTime: false,
      },
    })
  })

  // イベントのプロパティが正しく公開されている
  it('すべてのプロパティに正しくアクセスできる', () => {
    const event = new UserCreatedFromNextAuthEvent(
      'user_123',
      'nextauth_456',
      'test@example.com',
      'Test User',
      false
    )

    // 基底クラスのプロパティ
    expect(event.id).toBeDefined()
    expect(event.aggregateId).toBe('user_123')
    expect(event.occurredAt).toBeInstanceOf(Date)
    expect(event.version).toBe(1)

    // イベント固有のプロパティ
    expect(event.nextAuthId).toBe('nextauth_456')
    expect(event.email).toBe('test@example.com')
    expect(event.displayName).toBe('Test User')
    expect(event.isFirstTime).toBe(false)
  })
})
