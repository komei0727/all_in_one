import { describe, expect, it } from 'vitest'

import { CheckIngredientCommand } from '@/modules/ingredients/server/application/commands/check-ingredient.command'

describe('CheckIngredientCommand', () => {
  it('コマンドを作成できる', () => {
    // Given
    const sessionId = 'ses_1234567890'
    const ingredientId = 'ing_1234567890'
    const userId = 'usr_1234567890'

    // When
    const command = new CheckIngredientCommand(sessionId, ingredientId, userId)

    // Then
    expect(command.sessionId).toBe(sessionId)
    expect(command.ingredientId).toBe(ingredientId)
    expect(command.userId).toBe(userId)
  })
})
