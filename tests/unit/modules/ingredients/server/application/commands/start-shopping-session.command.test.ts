import { describe, expect, it } from 'vitest'

import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'

describe('StartShoppingSessionCommand', () => {
  describe('constructor', () => {
    it('正しいユーザーIDでコマンドを作成できる', () => {
      // Given: 有効なユーザーID
      const userId = 'usr_test123'

      // When: コマンドを作成
      const command = new StartShoppingSessionCommand(userId)

      // Then: 正しく作成される
      expect(command.userId).toBe(userId)
    })
  })
})
