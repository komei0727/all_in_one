import { describe, expect, it } from 'vitest'

import { CompleteShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/complete-shopping-session.handler'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

describe('CompositionRoot - CompleteShoppingSession', () => {
  it('getCompleteShoppingSessionApiHandlerが正しくインスタンスを返す', () => {
    // Given: CompositionRootのインスタンス
    const compositionRoot = CompositionRoot.getInstance()

    // When: getCompleteShoppingSessionApiHandlerを呼び出す
    const handler = compositionRoot.getCompleteShoppingSessionApiHandler()

    // Then: CompleteShoppingSessionApiHandlerのインスタンスが返される
    expect(handler).toBeInstanceOf(CompleteShoppingSessionApiHandler)
  })

  it('getCompleteShoppingSessionApiHandlerは毎回新しいインスタンスを返す', () => {
    // Given: CompositionRootのインスタンス
    const compositionRoot = CompositionRoot.getInstance()

    // When: 2回呼び出す
    const handler1 = compositionRoot.getCompleteShoppingSessionApiHandler()
    const handler2 = compositionRoot.getCompleteShoppingSessionApiHandler()

    // Then: 異なるインスタンスが返される
    expect(handler1).not.toBe(handler2)
  })
})
