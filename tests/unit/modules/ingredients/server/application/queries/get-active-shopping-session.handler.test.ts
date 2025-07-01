import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'
import { GetActiveShoppingSessionQuery } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.query'
import type { ShoppingSessionRepository } from '@/modules/ingredients/server/domain/repositories/shopping-session-repository.interface'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders'

describe('GetActiveShoppingSessionHandler', () => {
  let handler: GetActiveShoppingSessionHandler
  let mockRepository: ShoppingSessionRepository
  let userId: string

  beforeEach(() => {
    userId = faker.string.uuid()

    // リポジトリのモックを作成
    mockRepository = {
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    }

    handler = new GetActiveShoppingSessionHandler(mockRepository)
  })

  describe('handle', () => {
    it('アクティブなセッションがある場合はDTOを返す', async () => {
      // Given: クエリ
      const query = new GetActiveShoppingSessionQuery(userId)

      // アクティブなセッションのモック
      const activeSession = new ShoppingSessionBuilder().withUserId(userId).build()

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findActiveByUserId).mockResolvedValue(activeSession)

      // When: ハンドラーを実行
      const result = await handler.handle(query)

      // Then: DTOが返される
      expect(result).toBeInstanceOf(ShoppingSessionDto)
      expect(result?.sessionId).toBe(activeSession.getId().getValue())
      expect(result?.userId).toBe(userId)
      expect(result?.status).toBe('ACTIVE')

      // リポジトリが正しく呼ばれた
      expect(mockRepository.findActiveByUserId).toHaveBeenCalledWith(userId)
    })

    it('アクティブなセッションがない場合はnullを返す', async () => {
      // Given: クエリ
      const query = new GetActiveShoppingSessionQuery(userId)

      // リポジトリがnullを返す
      vi.mocked(mockRepository.findActiveByUserId).mockResolvedValue(null)

      // When: ハンドラーを実行
      const result = await handler.handle(query)

      // Then: nullが返される
      expect(result).toBeNull()

      // リポジトリが正しく呼ばれた
      expect(mockRepository.findActiveByUserId).toHaveBeenCalledWith(userId)
    })

    it('リポジトリのエラーを伝播する', async () => {
      // Given: クエリ
      const query = new GetActiveShoppingSessionQuery(userId)

      // リポジトリがエラーを投げる
      const error = new Error('データベースエラー')
      vi.mocked(mockRepository.findActiveByUserId).mockRejectedValue(error)

      // When/Then: エラーが伝播される
      await expect(handler.handle(query)).rejects.toThrow(error)
    })
  })
})
