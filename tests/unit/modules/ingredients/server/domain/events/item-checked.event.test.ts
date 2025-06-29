import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { ItemChecked } from '@/modules/ingredients/server/domain/events/item-checked.event'

describe('ItemChecked', () => {
  // テスト用の有効なデータを生成
  const createValidData = () => ({
    sessionId: faker.string.nanoid(),
    ingredientId: faker.string.nanoid(),
    ingredientName: faker.commerce.productName(),
    stockStatus: faker.helpers.arrayElement(['sufficient', 'low', 'out_of_stock']),
    expiryStatus: faker.helpers.arrayElement(['fresh', 'expiring_soon', 'expired']),
    checkedAt: faker.date.recent(),
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const data = createValidData()

    const event = new ItemChecked(
      data.sessionId,
      data.ingredientId,
      data.ingredientName,
      data.stockStatus,
      data.expiryStatus,
      data.checkedAt
    )

    expect(event.sessionId).toBe(data.sessionId)
    expect(event.ingredientId).toBe(data.ingredientId)
    expect(event.ingredientName).toBe(data.ingredientName)
    expect(event.stockStatus).toBe(data.stockStatus)
    expect(event.expiryStatus).toBe(data.expiryStatus)
    expect(event.checkedAt).toBe(data.checkedAt)
    expect(event.aggregateId).toBe(data.sessionId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const data = createValidData()
    const metadata = { source: 'mobile-app' }

    const event = new ItemChecked(
      data.sessionId,
      data.ingredientId,
      data.ingredientName,
      data.stockStatus,
      data.expiryStatus,
      data.checkedAt,
      metadata
    )

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const data = createValidData()

    const event = new ItemChecked(
      data.sessionId,
      data.ingredientId,
      data.ingredientName,
      data.stockStatus,
      data.expiryStatus,
      data.checkedAt
    )

    expect(event.eventName).toBe('ItemChecked')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const data = createValidData()

    const event = new ItemChecked(
      data.sessionId,
      data.ingredientId,
      data.ingredientName,
      data.stockStatus,
      data.expiryStatus,
      data.checkedAt
    )
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      sessionId: data.sessionId,
      ingredientId: data.ingredientId,
      ingredientName: data.ingredientName,
      stockStatus: data.stockStatus,
      expiryStatus: data.expiryStatus,
      checkedAt: data.checkedAt.toISOString(),
    })
  })

  // 異なる在庫状態と期限状態のテスト
  it('様々な在庫状態と期限状態でイベントを作成できる', () => {
    const data = {
      ...createValidData(),
      stockStatus: 'out_of_stock',
      expiryStatus: 'expired',
    }

    const event = new ItemChecked(
      data.sessionId,
      data.ingredientId,
      data.ingredientName,
      data.stockStatus,
      data.expiryStatus,
      data.checkedAt
    )

    expect(event.stockStatus).toBe('out_of_stock')
    expect(event.expiryStatus).toBe('expired')
  })

  // バリデーションエラー: セッションIDが空
  it('セッションIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        '',
        data.ingredientId,
        data.ingredientName,
        data.stockStatus,
        data.expiryStatus,
        data.checkedAt
      )
    }).toThrow('セッションIDは必須です')
  })

  // バリデーションエラー: セッションIDが空白文字のみ
  it('セッションIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        '   ',
        data.ingredientId,
        data.ingredientName,
        data.stockStatus,
        data.expiryStatus,
        data.checkedAt
      )
    }).toThrow('セッションIDは必須です')
  })

  // バリデーションエラー: 食材IDが空
  it('食材IDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        data.sessionId,
        '',
        data.ingredientName,
        data.stockStatus,
        data.expiryStatus,
        data.checkedAt
      )
    }).toThrow('食材IDは必須です')
  })

  // バリデーションエラー: 食材名が空
  it('食材名が空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        data.sessionId,
        data.ingredientId,
        '',
        data.stockStatus,
        data.expiryStatus,
        data.checkedAt
      )
    }).toThrow('食材名は必須です')
  })

  // バリデーションエラー: 在庫状態が空
  it('在庫状態が空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        data.sessionId,
        data.ingredientId,
        data.ingredientName,
        '',
        data.expiryStatus,
        data.checkedAt
      )
    }).toThrow('在庫状態は必須です')
  })

  // バリデーションエラー: 期限状態が空
  it('期限状態が空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        data.sessionId,
        data.ingredientId,
        data.ingredientName,
        data.stockStatus,
        '',
        data.checkedAt
      )
    }).toThrow('期限状態は必須です')
  })

  // バリデーションエラー: 無効な日付
  it('無効な日付の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        data.sessionId,
        data.ingredientId,
        data.ingredientName,
        data.stockStatus,
        data.expiryStatus,
        new Date('invalid')
      )
    }).toThrow('有効な確認日時が必要です')
  })

  // バリデーションエラー: 日付以外のオブジェクト
  it('日付以外のオブジェクトの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new ItemChecked(
        data.sessionId,
        data.ingredientId,
        data.ingredientName,
        data.stockStatus,
        data.expiryStatus,
        {} as Date
      )
    }).toThrow('有効な確認日時が必要です')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const data = createValidData()

    const event = new ItemChecked(
      data.sessionId,
      data.ingredientId,
      data.ingredientName,
      data.stockStatus,
      data.expiryStatus,
      data.checkedAt
    )
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', data.sessionId)
    expect(json).toHaveProperty('eventName', 'ItemChecked')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      sessionId: data.sessionId,
      ingredientId: data.ingredientId,
      ingredientName: data.ingredientName,
      stockStatus: data.stockStatus,
      expiryStatus: data.expiryStatus,
      checkedAt: data.checkedAt.toISOString(),
    })
  })
})
