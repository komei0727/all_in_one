import { describe, it, expect } from 'vitest'

import { NextAuthIntegrationFailedEvent } from '@/modules/user-authentication/server/domain/events/nextauth-integration-failed.event'

describe('NextAuthIntegrationFailedEvent', () => {
  // イベントの作成テスト
  it('イベントを正しく作成できる', () => {
    const nextAuthId = 'nextauth_123'
    const email = 'test@example.com'
    const errorType = 'USER_CREATION_FAILED'
    const errorMessage = '作成に失敗しました'
    const errorDetails = { code: 'DB_ERROR', stack: 'Error stack trace' }

    const event = new NextAuthIntegrationFailedEvent(
      nextAuthId,
      email,
      errorType,
      errorMessage,
      errorDetails
    )

    expect(event.nextAuthId).toBe(nextAuthId)
    expect(event.email).toBe(email)
    expect(event.errorType).toBe(errorType)
    expect(event.errorMessage).toBe(errorMessage)
    expect(event.errorDetails).toEqual(errorDetails)
  })

  // メールアドレスがundefinedの場合のテスト
  it('メールアドレスがundefinedでもイベントを作成できる', () => {
    const event = new NextAuthIntegrationFailedEvent(
      'nextauth_123',
      undefined,
      'VALIDATION_FAILED',
      'バリデーションエラー'
    )

    expect(event.email).toBeUndefined()
  })

  // デフォルト値のテスト
  it('errorDetailsのデフォルト値は空オブジェクト', () => {
    const event = new NextAuthIntegrationFailedEvent(
      'nextauth_123',
      'test@example.com',
      'SYNC_FAILED',
      '同期エラー'
    )

    expect(event.errorDetails).toEqual({})
  })

  // 各エラータイプのテスト
  it.each(['USER_CREATION_FAILED', 'SYNC_FAILED', 'VALIDATION_FAILED'] as const)(
    'エラータイプ %s でイベントを作成できる',
    (errorType) => {
      const event = new NextAuthIntegrationFailedEvent(
        'nextauth_123',
        'test@example.com',
        errorType,
        'エラーメッセージ'
      )
      expect(event.errorType).toBe(errorType)
    }
  )

  // イベント名の確認
  it('正しいイベント名を返す', () => {
    const event = new NextAuthIntegrationFailedEvent(
      'nextauth_123',
      'test@example.com',
      'USER_CREATION_FAILED',
      'エラー'
    )
    expect(event.eventName).toBe('user.nextAuthIntegrationFailed')
  })

  // JSON変換のテスト
  it('正しくJSON形式に変換できる', () => {
    const event = new NextAuthIntegrationFailedEvent(
      'nextauth_456',
      'user@example.com',
      'VALIDATION_FAILED',
      'メールアドレスが無効です',
      { field: 'email', value: 'invalid-email' }
    )

    const json = event.toJSON()

    expect(json).toMatchObject({
      id: expect.any(String),
      eventName: 'user.nextAuthIntegrationFailed',
      aggregateId: 'nextauth_456', // NextAuthIDが集約IDとして使用される
      version: 1,
      occurredAt: expect.any(String),
      payload: {
        nextAuthId: 'nextauth_456',
        email: 'user@example.com',
        errorType: 'VALIDATION_FAILED',
        errorMessage: 'メールアドレスが無効です',
        errorDetails: {
          field: 'email',
          value: 'invalid-email',
        },
      },
    })
  })

  // 複雑なエラー詳細のテスト
  it('ネストされたエラー詳細を保持できる', () => {
    const complexDetails = {
      error: {
        code: 'DB_UNIQUE_CONSTRAINT',
        message: 'Email already exists',
        details: {
          table: 'users',
          column: 'email',
          value: 'duplicate@example.com',
        },
      },
      timestamp: new Date().toISOString(),
      attemptNumber: 3,
    }

    const event = new NextAuthIntegrationFailedEvent(
      'nextauth_789',
      'duplicate@example.com',
      'USER_CREATION_FAILED',
      'ユーザー作成失敗',
      complexDetails
    )

    expect(event.errorDetails).toEqual(complexDetails)
  })
})
