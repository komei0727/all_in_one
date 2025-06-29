import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { ShoppingSessionCompleted } from '@/modules/ingredients/server/domain/events/shopping-session-completed.event'

describe('ShoppingSessionCompleted', () => {
  // テスト用の有効なデータを生成
  const createValidData = () => ({
    sessionId: faker.string.nanoid(),
    userId: faker.string.nanoid(),
    durationMs: faker.number.int({ min: 0, max: 3600000 }), // 0～1時間
    checkedItemsCount: faker.number.int({ min: 0, max: 50 }),
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const data = createValidData()

    const event = new ShoppingSessionCompleted(
      data.sessionId,
      data.userId,
      data.durationMs,
      data.checkedItemsCount
    )

    expect(event.sessionId).toBe(data.sessionId)
    expect(event.userId).toBe(data.userId)
    expect(event.durationMs).toBe(data.durationMs)
    expect(event.checkedItemsCount).toBe(data.checkedItemsCount)
    expect(event.aggregateId).toBe(data.sessionId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const data = createValidData()
    const metadata = { location: 'supermarket' }

    const event = new ShoppingSessionCompleted(
      data.sessionId,
      data.userId,
      data.durationMs,
      data.checkedItemsCount,
      metadata
    )

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const data = createValidData()

    const event = new ShoppingSessionCompleted(
      data.sessionId,
      data.userId,
      data.durationMs,
      data.checkedItemsCount
    )

    expect(event.eventName).toBe('ShoppingSessionCompleted')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const data = createValidData()

    const event = new ShoppingSessionCompleted(
      data.sessionId,
      data.userId,
      data.durationMs,
      data.checkedItemsCount
    )
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      sessionId: data.sessionId,
      userId: data.userId,
      durationMs: data.durationMs,
      checkedItemsCount: data.checkedItemsCount,
    })
  })

  // 継続時間が0の場合
  it('継続時間が0の場合もイベントを作成できる', () => {
    const data = { ...createValidData(), durationMs: 0 }

    const event = new ShoppingSessionCompleted(
      data.sessionId,
      data.userId,
      data.durationMs,
      data.checkedItemsCount
    )

    expect(event.durationMs).toBe(0)
  })

  // 確認件数が0の場合
  it('確認件数が0の場合もイベントを作成できる', () => {
    const data = { ...createValidData(), checkedItemsCount: 0 }

    const event = new ShoppingSessionCompleted(
      data.sessionId,
      data.userId,
      data.durationMs,
      data.checkedItemsCount
    )

    expect(event.checkedItemsCount).toBe(0)
  })

  // バリデーションエラー: セッションIDが空
  it('セッションIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionCompleted('', data.userId, data.durationMs, data.checkedItemsCount)
    }).toThrow('セッションIDは必須です')
  })

  // バリデーションエラー: セッションIDが空白文字のみ
  it('セッションIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionCompleted('   ', data.userId, data.durationMs, data.checkedItemsCount)
    }).toThrow('セッションIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionCompleted(data.sessionId, '', data.durationMs, data.checkedItemsCount)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionCompleted(data.sessionId, '   ', data.durationMs, data.checkedItemsCount)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 継続時間が負の値
  it('継続時間が負の値の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionCompleted(data.sessionId, data.userId, -1, data.checkedItemsCount)
    }).toThrow('継続時間は0以上である必要があります')
  })

  // バリデーションエラー: 確認件数が負の値
  it('確認件数が負の値の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ShoppingSessionCompleted(data.sessionId, data.userId, data.durationMs, -1)
    }).toThrow('確認件数は0以上である必要があります')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const data = createValidData()

    const event = new ShoppingSessionCompleted(
      data.sessionId,
      data.userId,
      data.durationMs,
      data.checkedItemsCount
    )
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', data.sessionId)
    expect(json).toHaveProperty('eventName', 'ShoppingSessionCompleted')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      sessionId: data.sessionId,
      userId: data.userId,
      durationMs: data.durationMs,
      checkedItemsCount: data.checkedItemsCount,
    })
  })
})
