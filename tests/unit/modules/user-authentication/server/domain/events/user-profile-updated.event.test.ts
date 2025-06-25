import { describe, it, expect } from 'vitest'

import { UserProfileUpdatedEvent } from '@/modules/user-authentication/server/domain/events/user-profile-updated.event'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'

describe('UserProfileUpdatedEvent', () => {
  // テスト用のプロフィール作成ヘルパー
  const createProfile = (displayName: string, theme: 'light' | 'dark' | 'auto' = 'light') => {
    return new UserProfile({
      displayName,
      timezone: 'Asia/Tokyo',
      language: 'ja',
      preferences: new UserPreferences({
        theme,
        notifications: true,
        emailFrequency: 'weekly',
      }),
    })
  }

  // イベントの作成テスト
  it('イベントを正しく作成できる', () => {
    const aggregateId = 'user_123'
    const oldProfile = createProfile('Old Name')
    const newProfile = createProfile('New Name')
    const updatedFields = ['displayName']

    const event = new UserProfileUpdatedEvent(aggregateId, oldProfile, newProfile, updatedFields)

    expect(event.aggregateId).toBe(aggregateId)
    expect(event.oldProfile).toBe(oldProfile)
    expect(event.newProfile).toBe(newProfile)
    expect(event.updatedFields).toEqual(updatedFields)
  })

  // イベント名の確認
  it('正しいイベント名を返す', () => {
    const event = new UserProfileUpdatedEvent(
      'user_123',
      createProfile('Old'),
      createProfile('New'),
      ['displayName']
    )

    expect(event.eventName).toBe('user.profileUpdated')
  })

  // JSON変換のテスト
  it('正しくJSON形式に変換できる', () => {
    const oldProfile = createProfile('Old Name', 'light')
    const newProfile = createProfile('New Name', 'dark')
    const event = new UserProfileUpdatedEvent('user_123', oldProfile, newProfile, [
      'displayName',
      'preferences',
    ])

    const json = event.toJSON()

    expect(json).toMatchObject({
      id: expect.any(String),
      eventName: 'user.profileUpdated',
      aggregateId: 'user_123',
      version: 1,
      occurredAt: expect.any(String),
      payload: {
        oldProfile: {
          displayName: 'Old Name',
          timezone: 'Asia/Tokyo',
          language: 'ja',
          preferences: {
            theme: 'light',
            notifications: true,
            emailFrequency: 'weekly',
          },
        },
        newProfile: {
          displayName: 'New Name',
          timezone: 'Asia/Tokyo',
          language: 'ja',
          preferences: {
            theme: 'dark',
            notifications: true,
            emailFrequency: 'weekly',
          },
        },
        updatedFields: ['displayName', 'preferences'],
      },
    })
  })

  // 複数フィールド更新のテスト
  it('複数のフィールド更新を記録できる', () => {
    const event = new UserProfileUpdatedEvent(
      'user_123',
      createProfile('Name1'),
      createProfile('Name2'),
      ['displayName', 'timezone', 'language', 'preferences']
    )

    expect(event.updatedFields).toHaveLength(4)
    expect(event.updatedFields).toContain('displayName')
    expect(event.updatedFields).toContain('timezone')
    expect(event.updatedFields).toContain('language')
    expect(event.updatedFields).toContain('preferences')
  })
})
