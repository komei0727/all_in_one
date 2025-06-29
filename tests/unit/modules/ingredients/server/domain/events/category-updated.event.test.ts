import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { CategoryUpdated } from '@/modules/ingredients/server/domain/events/category-updated.event'

describe('CategoryUpdated', () => {
  // テスト用の有効な変更データを生成
  const createValidChanges = () => ({
    name: { from: faker.commerce.department(), to: faker.commerce.department() },
    displayOrder: {
      from: faker.number.int({ min: 1, max: 10 }),
      to: faker.number.int({ min: 1, max: 10 }),
    },
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const categoryId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()

    const event = new CategoryUpdated(categoryId, userId, changes)

    expect(event.categoryId).toBe(categoryId)
    expect(event.userId).toBe(userId)
    expect(event.changes).toEqual(changes)
    expect(event.aggregateId).toBe(categoryId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const categoryId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()
    const metadata = { source: 'admin-panel' }

    const event = new CategoryUpdated(categoryId, userId, changes, metadata)

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const event = new CategoryUpdated(
      faker.string.nanoid(),
      faker.string.nanoid(),
      createValidChanges()
    )

    expect(event.eventName).toBe('CategoryUpdated')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const categoryId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()

    const event = new CategoryUpdated(categoryId, userId, changes)
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      categoryId,
      userId,
      changes,
    })
  })

  // 単一の変更でイベントを作成
  it('単一の変更でイベントを作成できる', () => {
    const categoryId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = {
      name: { from: 'Vegetables', to: 'Fresh Vegetables' },
    }

    const event = new CategoryUpdated(categoryId, userId, changes)

    expect(event.changes).toEqual(changes)
  })

  // バリデーションエラー: カテゴリーIDが空
  it('カテゴリーIDが空の場合エラーを投げる', () => {
    expect(() => {
      new CategoryUpdated('', faker.string.nanoid(), createValidChanges())
    }).toThrow('カテゴリーIDは必須です')
  })

  // バリデーションエラー: カテゴリーIDが空白文字のみ
  it('カテゴリーIDが空白文字のみの場合エラーを投げる', () => {
    expect(() => {
      new CategoryUpdated('   ', faker.string.nanoid(), createValidChanges())
    }).toThrow('カテゴリーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    expect(() => {
      new CategoryUpdated(faker.string.nanoid(), '', createValidChanges())
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    expect(() => {
      new CategoryUpdated(faker.string.nanoid(), '   ', createValidChanges())
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 変更内容がnull
  it('変更内容がnullの場合エラーを投げる', () => {
    expect(() => {
      new CategoryUpdated(faker.string.nanoid(), faker.string.nanoid(), null as any)
    }).toThrow('変更内容は必須です')
  })

  // バリデーションエラー: 変更内容が空オブジェクト
  it('変更内容が空オブジェクトの場合エラーを投げる', () => {
    expect(() => {
      new CategoryUpdated(faker.string.nanoid(), faker.string.nanoid(), {})
    }).toThrow('変更内容は必須です')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const categoryId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()

    const event = new CategoryUpdated(categoryId, userId, changes)
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', categoryId)
    expect(json).toHaveProperty('eventName', 'CategoryUpdated')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      categoryId,
      userId,
      changes,
    })
  })
})
