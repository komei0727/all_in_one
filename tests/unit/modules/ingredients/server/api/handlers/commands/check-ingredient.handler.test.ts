import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CheckIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/check-ingredient.handler'
import { CheckIngredientCommand } from '@/modules/ingredients/server/application/commands/check-ingredient.command'
import type { CheckIngredientHandler } from '@/modules/ingredients/server/application/commands/check-ingredient.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('CheckIngredientApiHandler', () => {
  let apiHandler: CheckIngredientApiHandler
  let mockCommandHandler: CheckIngredientHandler
  let userId: string
  let sessionId: string
  let ingredientId: string

  beforeEach(() => {
    userId = testDataHelpers.userId()
    sessionId = testDataHelpers.shoppingSessionId()
    ingredientId = testDataHelpers.ingredientId()

    mockCommandHandler = {
      handle: vi.fn(),
    } as unknown as CheckIngredientHandler

    apiHandler = new CheckIngredientApiHandler(mockCommandHandler)
  })

  describe('handle', () => {
    it('食材を正常にチェックできる', async () => {
      // Given: 正常なリクエスト
      const request = {
        sessionId,
        ingredientId,
        userId,
      }

      const expectedDto = new ShoppingSessionDto(
        sessionId,
        userId,
        'ACTIVE',
        new Date().toISOString(),
        null,
        null,
        null
      )

      vi.mocked(mockCommandHandler.handle).mockResolvedValue(expectedDto)

      // When: APIハンドラーを実行
      const result = await apiHandler.handle(request)

      // Then: 正しいコマンドが呼ばれ、DTOが返される
      expect(mockCommandHandler.handle).toHaveBeenCalledWith(
        new CheckIngredientCommand(sessionId, ingredientId, userId)
      )
      expect(result).toBe(expectedDto)
    })

    it('セッションが見つからない場合はエラー', async () => {
      // Given: 存在しないセッション
      const request = {
        sessionId,
        ingredientId,
        userId,
      }

      vi.mocked(mockCommandHandler.handle).mockRejectedValue(
        new NotFoundException('買い物セッション', sessionId)
      )

      // When/Then: エラーが発生
      await expect(apiHandler.handle(request)).rejects.toThrow(NotFoundException)
    })

    it('食材が見つからない場合はエラー', async () => {
      // Given: 存在しない食材
      const request = {
        sessionId,
        ingredientId,
        userId,
      }

      vi.mocked(mockCommandHandler.handle).mockRejectedValue(
        new NotFoundException('食材', ingredientId)
      )

      // When/Then: エラーが発生
      await expect(apiHandler.handle(request)).rejects.toThrow(NotFoundException)
    })

    it('権限がない場合はエラー', async () => {
      // Given: 権限のないユーザー
      const request = {
        sessionId,
        ingredientId,
        userId,
      }

      vi.mocked(mockCommandHandler.handle).mockRejectedValue(
        new BusinessRuleException('このセッションで食材を確認する権限がありません')
      )

      // When/Then: エラーが発生
      await expect(apiHandler.handle(request)).rejects.toThrow(BusinessRuleException)
    })

    it('セッションがアクティブでない場合はエラー', async () => {
      // Given: 非アクティブなセッション
      const request = {
        sessionId,
        ingredientId,
        userId,
      }

      vi.mocked(mockCommandHandler.handle).mockRejectedValue(
        new BusinessRuleException('アクティブでないセッションで食材を確認することはできません')
      )

      // When/Then: エラーが発生
      await expect(apiHandler.handle(request)).rejects.toThrow(BusinessRuleException)
    })

    it('既にチェック済みの食材の場合はエラー', async () => {
      // Given: 既にチェック済みの食材
      const request = {
        sessionId,
        ingredientId,
        userId,
      }

      vi.mocked(mockCommandHandler.handle).mockRejectedValue(
        new BusinessRuleException('この食材は既にチェック済みです')
      )

      // When/Then: エラーが発生
      await expect(apiHandler.handle(request)).rejects.toThrow(BusinessRuleException)
    })
  })
})
