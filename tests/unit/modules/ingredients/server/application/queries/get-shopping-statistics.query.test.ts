import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect } from 'vitest'

import { GetShoppingStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.query'

describe('GetShoppingStatisticsQuery', () => {
  it('正しいパラメータでクエリを作成できる', () => {
    // Given: テスト用のパラメータ
    const userId = faker.string.uuid()
    const periodDays = 30

    // When: クエリを作成
    const query = new GetShoppingStatisticsQuery(userId, periodDays)

    // Then: 正しくプロパティが設定される
    expect(query.userId).toBe(userId)
    expect(query.periodDays).toBe(periodDays)
  })

  it('periodDaysパラメータはオプショナルである', () => {
    // Given: periodDaysなしのパラメータ
    const userId = faker.string.uuid()

    // When: periodDaysなしでクエリを作成
    const query = new GetShoppingStatisticsQuery(userId)

    // Then: userIdが設定され、periodDaysはundefined
    expect(query.userId).toBe(userId)
    expect(query.periodDays).toBeUndefined()
  })

  it('最大値のperiodDaysでもクエリを作成できる', () => {
    // Given: 最大値のperiodDaysパラメータ（1年）
    const userId = faker.string.uuid()
    const periodDays = 365

    // When: 最大値でクエリを作成
    const query = new GetShoppingStatisticsQuery(userId, periodDays)

    // Then: 正しく設定される
    expect(query.periodDays).toBe(365)
  })

  it('最小値のperiodDaysでもクエリを作成できる', () => {
    // Given: 最小値のperiodDaysパラメータ
    const userId = faker.string.uuid()
    const periodDays = 1

    // When: 最小値でクエリを作成
    const query = new GetShoppingStatisticsQuery(userId, periodDays)

    // Then: 正しく設定される
    expect(query.periodDays).toBe(1)
  })
})
