import { describe, it, expect } from 'vitest'

import { UserDeactivatedEvent } from '@/modules/user-authentication/server/domain/events/user-deactivated.event'

describe('UserDeactivatedEvent', () => {
  // イベントの作成テスト
  it('イベントを正しく作成できる', () => {
    const aggregateId = 'user_123'
    const reason = 'USER_REQUEST'
    const deactivatedBy = 'user_123'
    const effectiveDate = new Date()

    const event = new UserDeactivatedEvent(aggregateId, reason, deactivatedBy, effectiveDate)

    expect(event.aggregateId).toBe(aggregateId)
    expect(event.reason).toBe(reason)
    expect(event.deactivatedBy).toBe(deactivatedBy)
    expect(event.effectiveDate).toBe(effectiveDate)
  })

  // デフォルト値のテスト
  it('effectiveDateのデフォルト値は現在時刻', () => {
    const beforeCreate = new Date()

    const event = new UserDeactivatedEvent('user_123', 'ADMIN_ACTION', 'admin_456')

    const afterCreate = new Date()

    expect(event.effectiveDate.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
    expect(event.effectiveDate.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
  })

  // 各理由のテスト
  it.each(['USER_REQUEST', 'ADMIN_ACTION', 'POLICY_VIOLATION', 'DATA_RETENTION'] as const)(
    '理由 %s でイベントを作成できる',
    (reason) => {
      const event = new UserDeactivatedEvent('user_123', reason, 'executor_456')
      expect(event.reason).toBe(reason)
    }
  )

  // イベント名の確認
  it('正しいイベント名を返す', () => {
    const event = new UserDeactivatedEvent('user_123', 'USER_REQUEST', 'user_123')
    expect(event.eventName).toBe('user.deactivated')
  })

  // JSON変換のテスト
  it('正しくJSON形式に変換できる', () => {
    const effectiveDate = new Date('2025-06-24T10:00:00Z')
    const event = new UserDeactivatedEvent(
      'user_123',
      'POLICY_VIOLATION',
      'admin_456',
      effectiveDate
    )

    const json = event.toJSON()

    expect(json).toMatchObject({
      id: expect.any(String),
      eventName: 'user.deactivated',
      aggregateId: 'user_123',
      version: 1,
      occurredAt: expect.any(String),
      payload: {
        reason: 'POLICY_VIOLATION',
        deactivatedBy: 'admin_456',
        effectiveDate: '2025-06-24T10:00:00.000Z',
      },
    })
  })

  // 異なる実行者によるイベント
  it('ユーザー自身による無効化を記録できる', () => {
    const userId = 'user_123'
    const event = new UserDeactivatedEvent(userId, 'USER_REQUEST', userId)

    expect(event.aggregateId).toBe(userId)
    expect(event.deactivatedBy).toBe(userId)
  })

  it('管理者による無効化を記録できる', () => {
    const event = new UserDeactivatedEvent('user_123', 'ADMIN_ACTION', 'admin_789')

    expect(event.aggregateId).toBe('user_123')
    expect(event.deactivatedBy).toBe('admin_789')
  })
})
