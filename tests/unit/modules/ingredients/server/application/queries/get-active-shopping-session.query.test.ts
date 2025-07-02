import { describe, expect, it } from 'vitest'

import { GetActiveShoppingSessionQuery } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.query'

describe('GetActiveShoppingSessionQuery', () => {
  describe('constructor', () => {
    it('正しいユーザーIDでクエリを作成できる', () => {
      // Given: 有効なユーザーID
      const userId = 'usr_test123'

      // When: クエリを作成
      const query = new GetActiveShoppingSessionQuery(userId)

      // Then: 正しく作成される
      expect(query.userId).toBe(userId)
    })
  })
})
