import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { BatchStockUpdate } from '@/modules/ingredients/server/domain/events/batch-stock-update.event'

describe('BatchStockUpdate', () => {
  // テスト用の有効な更新データを生成
  const createValidUpdate = () => ({
    ingredientId: faker.string.nanoid(),
    previousQuantity: faker.number.int({ min: 0, max: 100 }),
    newQuantity: faker.number.int({ min: 0, max: 100 }),
    unitId: faker.string.nanoid(),
  })

  // 有効なイベントの作成
  it('有効なデータでイベントを作成できる', () => {
    const batchId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const updates = [createValidUpdate(), createValidUpdate()]

    const event = new BatchStockUpdate(batchId, userId, updates)

    expect(event.batchId).toBe(batchId)
    expect(event.userId).toBe(userId)
    expect(event.updates).toEqual(updates)
    expect(event.aggregateId).toBe(batchId)
  })

  // メタデータ付きでイベントを作成
  it('メタデータ付きでイベントを作成できる', () => {
    const batchId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const updates = [createValidUpdate()]
    const metadata = { source: 'bulk-import' }

    const event = new BatchStockUpdate(batchId, userId, updates, metadata)

    expect(event.metadata).toEqual(metadata)
  })

  // eventName プロパティの確認
  it('正しいイベント名を返す', () => {
    const event = new BatchStockUpdate(faker.string.nanoid(), faker.string.nanoid(), [
      createValidUpdate(),
    ])

    expect(event.eventName).toBe('BatchStockUpdate')
  })

  // getPayload メソッドのテスト
  it('正しいペイロードを返す', () => {
    const batchId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const updates = [createValidUpdate(), createValidUpdate(), createValidUpdate()]

    const event = new BatchStockUpdate(batchId, userId, updates)
    const payload = event.toJSON().payload

    expect(payload).toEqual({
      batchId,
      userId,
      updates,
      updateCount: 3,
    })
  })

  // バリデーションエラー: バッチIDが空
  it('バッチIDが空の場合エラーを投げる', () => {
    expect(() => {
      new BatchStockUpdate('', faker.string.nanoid(), [createValidUpdate()])
    }).toThrow('バッチIDは必須です')
  })

  // バリデーションエラー: バッチIDが空白文字のみ
  it('バッチIDが空白文字のみの場合エラーを投げる', () => {
    expect(() => {
      new BatchStockUpdate('   ', faker.string.nanoid(), [createValidUpdate()])
    }).toThrow('バッチIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空
  it('ユーザーIDが空の場合エラーを投げる', () => {
    expect(() => {
      new BatchStockUpdate(faker.string.nanoid(), '', [createValidUpdate()])
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: ユーザーIDが空白文字のみ
  it('ユーザーIDが空白文字のみの場合エラーを投げる', () => {
    expect(() => {
      new BatchStockUpdate(faker.string.nanoid(), '   ', [createValidUpdate()])
    }).toThrow('ユーザーIDは必須です')
  })

  // バリデーションエラー: 更新データがnull
  it('更新データがnullの場合エラーを投げる', () => {
    expect(() => {
      new BatchStockUpdate(faker.string.nanoid(), faker.string.nanoid(), null as any)
    }).toThrow('更新データは必須です')
  })

  // バリデーションエラー: 更新データが空配列
  it('更新データが空配列の場合エラーを投げる', () => {
    expect(() => {
      new BatchStockUpdate(faker.string.nanoid(), faker.string.nanoid(), [])
    }).toThrow('更新データは必須です')
  })

  // toJSON メソッドの動作確認
  it('toJSONで正しい形式のオブジェクトを返す', () => {
    const batchId = faker.string.nanoid()
    const userId = faker.string.nanoid()
    const updates = [createValidUpdate()]

    const event = new BatchStockUpdate(batchId, userId, updates)
    const json = event.toJSON()

    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('aggregateId', batchId)
    expect(json).toHaveProperty('eventName', 'BatchStockUpdate')
    expect(json).toHaveProperty('occurredAt')
    expect(json).toHaveProperty('payload')
    expect(json.payload).toEqual({
      batchId,
      userId,
      updates,
      updateCount: 1,
    })
  })
})
