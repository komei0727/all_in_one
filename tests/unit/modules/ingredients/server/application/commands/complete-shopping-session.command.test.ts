import { describe, expect, it } from 'vitest'

import { CompleteShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/complete-shopping-session.command'

describe('CompleteShoppingSessionCommand', () => {
  describe('constructor', () => {
    it('正しいセッションIDとユーザーIDでコマンドを作成できる', () => {
      // Given: 有効なセッションIDとユーザーID
      const sessionId = 'ses_test123'
      const userId = 'usr_test456'

      // When: コマンドを作成
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // Then: 正しく作成される
      expect(command.sessionId).toBe(sessionId)
      expect(command.userId).toBe(userId)
    })
  })
})
