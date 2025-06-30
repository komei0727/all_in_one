import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { UnitUpdated } from '@/modules/ingredients/server/domain/events/unit-updated.event'

describe('UnitUpdated', () => {
  // テスト用の有効な変更データを生成
  const createValidChanges = () => ({
    name: { from: 'Kilogram', to: 'Kg' },
    symbol: { from: 'kilogram', to: 'kg' },
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const unitId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()

    const event = new UnitUpdated(unitId, userId, changes)

    expect(event.unitId).toBe(unitId)
    expect(event.userId).toBe(userId)
    expect(event.changes).toEqual(changes)
    expect(event.aggregateId).toBe(unitId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const unitId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()
    const metadata = { source: 'admin-panel' }

    const event = new UnitUpdated(unitId, userId, changes, metadata)

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const event = new UnitUpdated(
      faker.string.nanoid(),
      faker.string.nanoid(),
      createValidChanges()
    )

    expect(event.eventName).toBe('UnitUpdated')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const unitId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()

    const event = new UnitUpdated(unitId, userId, changes)
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      unitId,
      userId,
      changes,
    })
  })

  // 単一の変更でイベントを作成
  it('単一の変更でイベントを作成できる', () => {
    const unitId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = {
      type: { from: 'volume', to: 'weight' },
    }

    const event = new UnitUpdated(unitId, userId, changes)

    expect(event.changes).toEqual(changes)
  })

  // 複数の変更でイベントを作成
  it('複数の変更でイベントを作成できる', () => {
    const unitId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = {
      name: { from: 'Gram', to: 'グラム' },
      symbol: { from: 'g', to: 'g' },
      type: { from: 'mass', to: 'weight' },
    }

    const event = new UnitUpdated(unitId, userId, changes)

    expect(event.changes).toEqual(changes)
  })

  // バリデーションエラー: 単位IDが空
  it('単位IDが空の場合エラーを投げる', () => {
    expect(() => {
      new UnitUpdated('', faker.string.nanoid(), createValidChanges())
    }).toThrow('単位IDは必須です')
  })

  // バリデーションエラー: 単位IDが空白文字のみ
  it('単位IDが空白文字のみの場合エラーを投げる', () => {
    expect(() => {
      new UnitUpdated('   ', faker.string.nanoid(), createValidChanges())
    }).toThrow('単位IDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    expect(() => {
      new UnitUpdated(faker.string.nanoid(), '', createValidChanges())
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    expect(() => {
      new UnitUpdated(faker.string.nanoid(), '   ', createValidChanges())
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 変更内容がnull
  it('変更内容がnullの場合エラーを投げる', () => {
    expect(() => {
      new UnitUpdated(faker.string.nanoid(), faker.string.nanoid(), null as any)
    }).toThrow('変更内容は必須です')
  })

  // バリデーションエラー: 変更内容が空オブジェクト
  it('変更内容が空オブジェクトの場合エラーを投げる', () => {
    expect(() => {
      new UnitUpdated(faker.string.nanoid(), faker.string.nanoid(), {})
    }).toThrow('変更内容は必須です')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const unitId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const changes = createValidChanges()

    const event = new UnitUpdated(unitId, userId, changes)
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', unitId)
    expect(json).toHaveProperty('eventName', 'UnitUpdated')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      unitId,
      userId,
      changes,
    })
  })
})
