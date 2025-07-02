import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { ShoppingSessionStarted } from '@/modules/ingredients/server/domain/events/shopping-session-started.event'
import { DeviceType, ShoppingLocation } from '@/modules/ingredients/server/domain/value-objects'

describe('ShoppingSessionStarted', () => {
  // テスト用の有効なデータを生成
  const createValidData = () => ({
    sessionId: faker.string.nanoid(),
    userId: faker.string.nanoid(),
    startedAt: faker.date.recent(),
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const data = createValidData()

    const event = new ShoppingSessionStarted(data.sessionId, data.userId, data.startedAt)

    expect(event.sessionId).toBe(data.sessionId)
    expect(event.userId).toBe(data.userId)
    expect(event.startedAt).toBe(data.startedAt)
    expect(event.aggregateId).toBe(data.sessionId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const data = createValidData()
    const metadata = { device: 'mobile', appVersion: '1.2.3' }

    const event = new ShoppingSessionStarted(data.sessionId, data.userId, data.startedAt, metadata)

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const data = createValidData()

    const event = new ShoppingSessionStarted(data.sessionId, data.userId, data.startedAt)

    expect(event.eventName).toBe('ShoppingSessionStarted')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const data = createValidData()

    const event = new ShoppingSessionStarted(data.sessionId, data.userId, data.startedAt)
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      sessionId: data.sessionId,
      userId: data.userId,
      startedAt: data.startedAt.toISOString(),
    })
  })

  // 現在時刻でのイベント作成
  it('現在時刻でイベントを作成できる', () => {
    const data = { ...createValidData(), startedAt: new Date() }

    const event = new ShoppingSessionStarted(data.sessionId, data.userId, data.startedAt)

    expect(event.startedAt).toBeInstanceOf(Date)
    expect(event.startedAt.getTime()).toBeCloseTo(Date.now(), -1)
  })

  // 特定の日時でのイベント作成
  it('特定の日時でイベントを作成できる', () => {
    const data = createValidData()
    const specificDate = new Date('2024-01-01T10:00:00Z')

    const event = new ShoppingSessionStarted(data.sessionId, data.userId, specificDate)

    expect(event.startedAt).toEqual(specificDate)
    const payload = event.toJSON().payload as any
    expect(payload.startedAt).toBe('2024-01-01T10:00:00.000Z')
  })

  // バリデーションエラー: セッションIDが空
  it('セッションIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionStarted('', data.userId, data.startedAt)
    }).toThrow('セッションIDは必須です')
  })

  // バリデーションエラー: セッションIDが空白文字のみ
  it('セッションIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionStarted('   ', data.userId, data.startedAt)
    }).toThrow('セッションIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionStarted(data.sessionId, '', data.startedAt)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionStarted(data.sessionId, '   ', data.startedAt)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 無効な日付
  it('無効な日付の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionStarted(data.sessionId, data.userId, new Date('invalid'))
    }).toThrow('有効な開始日時が必要です')
  })

  // バリデーションエラー: 日付以外のオブジェクト
  it('日付以外のオブジェクトの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionStarted(data.sessionId, data.userId, {} as Date)
    }).toThrow('有効な開始日時が必要です')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const data = createValidData()

    const event = new ShoppingSessionStarted(data.sessionId, data.userId, data.startedAt)
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', data.sessionId)
    expect(json).toHaveProperty('eventName', 'ShoppingSessionStarted')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      sessionId: data.sessionId,
      userId: data.userId,
      startedAt: data.startedAt.toISOString(),
    })
  })

  describe('deviceType and location', () => {
    it('deviceTypeとlocationを含むイベントを作成できる', () => {
      // Given
      const data = createValidData()
      const deviceType = DeviceType.MOBILE
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // When
      const event = new ShoppingSessionStarted(
        data.sessionId,
        data.userId,
        data.startedAt,
        {},
        deviceType,
        location
      )

      // Then
      expect(event.deviceType).toBe(deviceType)
      expect(event.location).toBe(location)
    })

    it('deviceTypeのみを含むイベントを作成できる', () => {
      // Given
      const data = createValidData()
      const deviceType = DeviceType.TABLET

      // When
      const event = new ShoppingSessionStarted(
        data.sessionId,
        data.userId,
        data.startedAt,
        {},
        deviceType
      )

      // Then
      expect(event.deviceType).toBe(deviceType)
      expect(event.location).toBeUndefined()
    })

    it('locationのみを含むイベントを作成できる', () => {
      // Given
      const data = createValidData()
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      // When
      const event = new ShoppingSessionStarted(
        data.sessionId,
        data.userId,
        data.startedAt,
        {},
        undefined,
        location
      )

      // Then
      expect(event.deviceType).toBeUndefined()
      expect(event.location).toBe(location)
    })

    it('deviceTypeとlocationなしでイベントを作成できる', () => {
      // Given
      const data = createValidData()

      // When
      const event = new ShoppingSessionStarted(data.sessionId, data.userId, data.startedAt)

      // Then
      expect(event.deviceType).toBeUndefined()
      expect(event.location).toBeUndefined()
    })

    it('deviceTypeとlocationを含むペイロードを返す', () => {
      // Given
      const data = createValidData()
      const deviceType = DeviceType.MOBILE
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // When
      const event = new ShoppingSessionStarted(
        data.sessionId,
        data.userId,
        data.startedAt,
        {},
        deviceType,
        location
      )
      const payload = event.toJSON().payload

      // Then
      expect(payload).toEqual({
        sessionId: data.sessionId,
        userId: data.userId,
        startedAt: data.startedAt.toISOString(),
        deviceType: 'MOBILE',
        location: {
          name: '東京駅前スーパー',
          latitude: 35.6762,
          longitude: 139.6503,
        },
      })
    })
  })
})
