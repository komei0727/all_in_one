import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { IngredientExpiringSoon } from '@/modules/ingredients/server/domain/events/ingredient-expiring-soon.event'

describe('IngredientExpiringSoon', () => {
  // テスト用の有効なデータを生成
  const createValidData = () => ({
    ingredientId: faker.string.nanoid(),
    userId: faker.string.nanoid(),
    ingredientName: faker.commerce.productName(),
    remainingDays: faker.number.int({ min: 0, max: 7 }),
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const data = createValidData()

    const event = new IngredientExpiringSoon(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.remainingDays
    )

    expect(event.ingredientId).toBe(data.ingredientId)
    expect(event.userId).toBe(data.userId)
    expect(event.ingredientName).toBe(data.ingredientName)
    expect(event.remainingDays).toBe(data.remainingDays)
    expect(event.aggregateId).toBe(data.ingredientId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const data = createValidData()
    const metadata = { source: 'batch-check' }

    const event = new IngredientExpiringSoon(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.remainingDays,
      metadata
    )

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const data = createValidData()

    const event = new IngredientExpiringSoon(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.remainingDays
    )

    expect(event.eventName).toBe('IngredientExpiringSoon')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const data = createValidData()

    const event = new IngredientExpiringSoon(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.remainingDays
    )
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      ingredientId: data.ingredientId,
      userId: data.userId,
      ingredientName: data.ingredientName,
      remainingDays: data.remainingDays,
    })
  })

  // 残り日数が0の場合（期限当日）
  it('残り日数が0の場合もイベントを作成できる', () => {
    const data = { ...createValidData(), remainingDays: 0 }

    const event = new IngredientExpiringSoon(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.remainingDays
    )

    expect(event.remainingDays).toBe(0)
  })

  // バリデーションエラー: 食材IDが空
  it('食材IDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon('', data.userId, data.ingredientName, data.remainingDays)
    }).toThrow('食材IDは必須です')
  })

  // バリデーションエラー: 食材IDが空白文字のみ
  it('食材IDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon('   ', data.userId, data.ingredientName, data.remainingDays)
    }).toThrow('食材IDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon(data.ingredientId, '', data.ingredientName, data.remainingDays)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon(data.ingredientId, '   ', data.ingredientName, data.remainingDays)
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 食材名が空
  it('食材名が空の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon(data.ingredientId, data.userId, '', data.remainingDays)
    }).toThrow('食材名は必須です')
  })

  // バリデーションエラー: 食材名が空白文字のみ
  it('食材名が空白文字のみの場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon(data.ingredientId, data.userId, '   ', data.remainingDays)
    }).toThrow('食材名は必須です')
  })

  // バリデーションエラー: 残り日数が整数でない
  it('残り日数が整数でない場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon(data.ingredientId, data.userId, data.ingredientName, 1.5)
    }).toThrow('残り日数は整数である必要があります')
  })

  // バリデーションエラー: 残り日数が負の値
  it('残り日数が負の値の場合エラーを投げる', () => {
    const data = createValidData()

    expect(() => {
      new IngredientExpiringSoon(data.ingredientId, data.userId, data.ingredientName, -1)
    }).toThrow('残り日数は0以上である必要があります')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const data = createValidData()

    const event = new IngredientExpiringSoon(
      data.ingredientId,
      data.userId,
      data.ingredientName,
      data.remainingDays
    )
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', data.ingredientId)
    expect(json).toHaveProperty('eventName', 'IngredientExpiringSoon')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      ingredientId: data.ingredientId,
      userId: data.userId,
      ingredientName: data.ingredientName,
      remainingDays: data.remainingDays,
    })
  })
})
