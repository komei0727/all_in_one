import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect } from 'vitest'

import { GetIngredientCheckStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-ingredient-check-statistics.query'

describe('GetIngredientCheckStatisticsQuery', () => {
  it('userIdのみでクエリを作成できる', () => {
    // Given: テスト用のuserIdのみ
    const userId = faker.string.uuid()

    // When: クエリを作成
    const query = new GetIngredientCheckStatisticsQuery(userId)

    // Then: 正しくプロパティが設定される
    expect(query.userId).toBe(userId)
    expect(query.ingredientId).toBeUndefined()
  })

  it('userIdとingredientIdでクエリを作成できる', () => {
    // Given: userIdとingredientId
    const userId = faker.string.uuid()
    const ingredientId = faker.string.uuid()

    // When: クエリを作成
    const query = new GetIngredientCheckStatisticsQuery(userId, ingredientId)

    // Then: 両方のプロパティが設定される
    expect(query.userId).toBe(userId)
    expect(query.ingredientId).toBe(ingredientId)
  })

  it('ingredientIdはオプショナルである', () => {
    // Given: ingredientIdなしのパラメータ
    const userId = faker.string.uuid()

    // When: ingredientIdなしでクエリを作成
    const query = new GetIngredientCheckStatisticsQuery(userId)

    // Then: userIdが設定され、ingredientIdはundefined
    expect(query.userId).toBe(userId)
    expect(query.ingredientId).toBeUndefined()
  })

  it('空文字のingredientIdは許可されない（実装では検証される想定）', () => {
    // Given: 空文字のingredientId
    const userId = faker.string.uuid()
    const ingredientId = ''

    // When: 空文字でクエリを作成
    const query = new GetIngredientCheckStatisticsQuery(userId, ingredientId)

    // Then: 値は設定される（検証は別の場所で行われる）
    expect(query.ingredientId).toBe('')
  })
})
