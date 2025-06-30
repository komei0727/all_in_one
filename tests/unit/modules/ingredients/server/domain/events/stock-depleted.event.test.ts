import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { StockDepleted } from '@/modules/ingredients/server/domain/events/stock-depleted.event'

describe('StockDepleted', () => {
  // テスト用の有効なデータを生成
  const createValidData = () => ({
    ingredientId: faker.string.nanoid(),
    userId: faker.string.nanoid(),
    ingredientName: faker.commerce.productName(),
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const data = createValidData()

    const event = new StockDepleted(data.ingredientId, data.userId, data.ingredientName)

    expect(event.ingredientId).toBe(data.ingredientId)
    expect(event.userId).toBe(data.userId)
    expect(event.ingredientName).toBe(data.ingredientName)
    expect(event.aggregateId).toBe(data.ingredientId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const data = createValidData()
    const metadata = { source: 'consumption-tracking' }

    const event = new StockDepleted(data.ingredientId, data.userId, data.ingredientName, metadata)

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const data = createValidData()

    const event = new StockDepleted(data.ingredientId, data.userId, data.ingredientName)

    expect(event.eventName).toBe('StockDepleted')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const data = createValidData()

    const event = new StockDepleted(data.ingredientId, data.userId, data.ingredientName)
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      ingredientId: data.ingredientId,
      userId: data.userId,
      ingredientName: data.ingredientName,
    })
  })

  // 日本語の食材名でのテスト
  it('日本語の食材名でイベントを作成できる', () => {
    const data = {
      ...createValidData(),
      ingredientName: 'トマト',
    }

    const event = new StockDepleted(data.ingredientId, data.userId, data.ingredientName)

    expect(event.ingredientName).toBe('トマト')
  })

  // バリデーションエラー: 食材IDが空
  it('食材IDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new StockDepleted('', data.userId, data.ingredientName)
    }).toThrow('食材IDは必須です')
  })

  // バリデーションエラー: 食材IDが空白文字のみ
  it('食材IDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new StockDepleted('   ', data.userId, data.ingredientName)
    }).toThrow('食材IDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new StockDepleted(data.ingredientId, '', data.ingredientName)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new StockDepleted(data.ingredientId, '   ', data.ingredientName)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 食材名が空
  it('食材名が空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new StockDepleted(data.ingredientId, data.userId, '')
    }).toThrow('食材名は必須です')
  })

  // バリデーションエラー: 食材名が空白文字のみ
  it('食材名が空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new StockDepleted(data.ingredientId, data.userId, '   ')
    }).toThrow('食材名は必須です')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const data = createValidData()

    const event = new StockDepleted(data.ingredientId, data.userId, data.ingredientName)
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', data.ingredientId)
    expect(json).toHaveProperty('eventName', 'StockDepleted')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      ingredientId: data.ingredientId,
      userId: data.userId,
      ingredientName: data.ingredientName,
    })
  })
})
