import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect } from 'vitest'

import { GetQuickAccessIngredientsQuery } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.query'

describe('GetQuickAccessIngredientsQuery', () => {
  it('正しいパラメータでクエリを作成できる', () => {
    // Given: テスト用のパラメータ
    const userId = faker.string.uuid()
    const limit = 10

    // When: クエリを作成
    const query = new GetQuickAccessIngredientsQuery(userId, limit)

    // Then: 正しくプロパティが設定される
    expect(query.userId).toBe(userId)
    expect(query.limit).toBe(limit)
  })

  it('limitパラメータはオプショナルである', () => {
    // Given: limitなしのパラメータ
    const userId = faker.string.uuid()

    // When: limitなしでクエリを作成
    const query = new GetQuickAccessIngredientsQuery(userId)

    // Then: userIdが設定され、limitはundefined
    expect(query.userId).toBe(userId)
    expect(query.limit).toBeUndefined()
  })

  it('最大値のlimitでもクエリを作成できる', () => {
    // Given: 最大値のlimitパラメータ
    const userId = faker.string.uuid()
    const limit = 100

    // When: 最大値でクエリを作成
    const query = new GetQuickAccessIngredientsQuery(userId, limit)

    // Then: 正しく設定される
    expect(query.limit).toBe(100)
  })

  it('最小値のlimitでもクエリを作成できる', () => {
    // Given: 最小値のlimitパラメータ
    const userId = faker.string.uuid()
    const limit = 1

    // When: 最小値でクエリを作成
    const query = new GetQuickAccessIngredientsQuery(userId, limit)

    // Then: 正しく設定される
    expect(query.limit).toBe(1)
  })
})
