import { describe, it, expect } from 'vitest'

import { UserSyncedWithNextAuthEvent } from '@/modules/user-authentication/server/domain/events/user-synced-with-nextauth.event'

describe('UserSyncedWithNextAuthEvent', () => {
  // イベントの作成テスト
  it('イベントを正しく作成できる', () => {
    const aggregateId = 'user_123'
    const nextAuthId = 'nextauth_456'
    const syncedFields: ('email' | 'name' | 'lastLoginAt')[] = ['email', 'lastLoginAt']
    const changes = [
      { field: 'email', oldValue: 'old@example.com', newValue: 'new@example.com' },
      { field: 'lastLoginAt', oldValue: null, newValue: new Date() },
    ]

    const event = new UserSyncedWithNextAuthEvent(aggregateId, nextAuthId, syncedFields, changes)

    expect(event.aggregateId).toBe(aggregateId)
    expect(event.nextAuthId).toBe(nextAuthId)
    expect(event.syncedFields).toEqual(syncedFields)
    expect(event.changes).toEqual(changes)
  })

  // 空の変更リストのテスト
  it('変更がない場合も処理できる', () => {
    const event = new UserSyncedWithNextAuthEvent('user_123', 'nextauth_456', [], [])

    expect(event.syncedFields).toEqual([])
    expect(event.changes).toEqual([])
  })

  // 各フィールドタイプの同期テスト
  it.each([
    ['email', 'old@example.com', 'new@example.com'],
    ['name', 'Old Name', 'New Name'],
    ['lastLoginAt', new Date('2025-06-01'), new Date('2025-06-24')],
  ])('フィールド %s の同期を記録できる', (field, oldValue, newValue) => {
    const event = new UserSyncedWithNextAuthEvent(
      'user_123',
      'nextauth_456',
      [field as 'email' | 'name' | 'lastLoginAt'],
      [{ field, oldValue, newValue }]
    )

    expect(event.syncedFields).toContain(field)
    expect(event.changes[0]).toEqual({ field, oldValue, newValue })
  })

  // イベント名の確認
  it('正しいイベント名を返す', () => {
    const event = new UserSyncedWithNextAuthEvent('user_123', 'nextauth_456', [], [])
    expect(event.eventName).toBe('user.syncedWithNextAuth')
  })

  // JSON変換のテスト
  it('正しくJSON形式に変換できる', () => {
    const loginDate = new Date('2025-06-24T10:00:00Z')
    const event = new UserSyncedWithNextAuthEvent(
      'user_123',
      'nextauth_789',
      ['email', 'name', 'lastLoginAt'],
      [
        { field: 'email', oldValue: 'old@test.com', newValue: 'new@test.com' },
        { field: 'name', oldValue: 'Old Name', newValue: 'New Name' },
        { field: 'lastLoginAt', oldValue: null, newValue: loginDate },
      ]
    )

    const json = event.toJSON()

    expect(json).toMatchObject({
      id: expect.any(String),
      eventName: 'user.syncedWithNextAuth',
      aggregateId: 'user_123',
      version: 1,
      occurredAt: expect.any(String),
      payload: {
        nextAuthId: 'nextauth_789',
        syncedFields: ['email', 'name', 'lastLoginAt'],
        changes: [
          { field: 'email', oldValue: 'old@test.com', newValue: 'new@test.com' },
          { field: 'name', oldValue: 'Old Name', newValue: 'New Name' },
          { field: 'lastLoginAt', oldValue: null, newValue: loginDate },
        ],
      },
    })
  })

  // 複数フィールド同期のテスト
  it('複数のフィールドを同時に同期できる', () => {
    const event = new UserSyncedWithNextAuthEvent(
      'user_123',
      'nextauth_456',
      ['email', 'name'],
      [
        { field: 'email', oldValue: 'a@example.com', newValue: 'b@example.com' },
        { field: 'name', oldValue: 'Name A', newValue: 'Name B' },
      ]
    )

    expect(event.syncedFields).toHaveLength(2)
    expect(event.changes).toHaveLength(2)
  })

  // 値の型が異なる変更のテスト
  it('異なる型の値の変更を記録できる', () => {
    const changes = [
      { field: 'verified', oldValue: false, newValue: true },
      { field: 'profileImage', oldValue: null, newValue: 'https://example.com/image.jpg' },
      { field: 'metadata', oldValue: {}, newValue: { key: 'value' } },
    ]

    const event = new UserSyncedWithNextAuthEvent(
      'user_123',
      'nextauth_456',
      ['email'], // syncedFieldsは限定的
      changes
    )

    expect(event.changes).toEqual(changes)
  })
})
