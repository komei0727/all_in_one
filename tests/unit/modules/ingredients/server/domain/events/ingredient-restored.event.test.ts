import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { IngredientRestored } from '@/modules/ingredients/server/domain/events/ingredient-restored.event'

describe('IngredientRestored', () => {
  // テスト用の有効なデータを生成
  const createValidData = () => ({
    ingredientId: faker.string.nanoid(),
    userId: faker.string.nanoid(),
    ingredientName: faker.commerce.productName(),
    restoredFromDate: faker.date.recent(),
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const data = createValidData()

    const event = new IngredientRestored(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.restoredFromDate
    )

    expect(event.ingredientId).toBe(data.ingredientId)
    expect(event.userId).toBe(data.userId)
    expect(event.ingredientName).toBe(data.ingredientName)
    expect(event.restoredFromDate).toBe(data.restoredFromDate)
    expect(event.aggregateId).toBe(data.ingredientId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const data = createValidData()
    const metadata = { source: 'undo-action' }

    const event = new IngredientRestored(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.restoredFromDate,
      metadata
    )

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const data = createValidData()

    const event = new IngredientRestored(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.restoredFromDate
    )

    expect(event.eventName).toBe('IngredientRestored')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const data = createValidData()

    const event = new IngredientRestored(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.restoredFromDate
    )
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      ingredientId: data.ingredientId,
      userId: data.userId,
      ingredientName: data.ingredientName,
      restoredFromDate: data.restoredFromDate.toISOString(),
    })
  })

  // 異なる日付形式でのテスト
  it('異なる日付でイベントを作成できる', () => {
    const data = createValidData()
    const pastDate = new Date('2023-01-01T00:00:00Z')

    const event = new IngredientRestored(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      pastDate
    )

    expect(event.restoredFromDate).toEqual(pastDate)
    const payload = event.toJSON().payload as any
    expect(payload.restoredFromDate).toBe('2023-01-01T00:00:00.000Z')
  })

  // バリデーションエラー: 食材IDが空
  it('食材IDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientRestored('', data.userId, data.ingredientName, data.restoredFromDate)
    }).toThrow('食材IDは必須です')
  })

  // バリデーションエラー: 食材IDが空白文字のみ
  it('食材IDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientRestored('   ', data.userId, data.ingredientName, data.restoredFromDate)
    }).toThrow('食材IDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientRestored(data.ingredientId, '', data.ingredientName, data.restoredFromDate)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientRestored(data.ingredientId, '   ', data.ingredientName, data.restoredFromDate)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 食材名が空
  it('食材名が空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientRestored(data.ingredientId, data.userId, '', data.restoredFromDate)
    }).toThrow('食材名は必須です')
  })

  // バリデーションエラー: 食材名が空白文字のみ
  it('食材名が空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientRestored(data.ingredientId, data.userId, '   ', data.restoredFromDate)
    }).toThrow('食材名は必須です')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const data = createValidData()

    const event = new IngredientRestored(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.restoredFromDate
    )
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', data.ingredientId)
    expect(json).toHaveProperty('eventName', 'IngredientRestored')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      ingredientId: data.ingredientId,
      userId: data.userId,
      ingredientName: data.ingredientName,
      restoredFromDate: data.restoredFromDate.toISOString(),
    })
  })
})
