import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'
import { StartShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/start-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { type ShoppingSessionFactory } from '@/modules/ingredients/server/domain/factories/shopping-session.factory'
import type { ShoppingSessionRepository } from '@/modules/ingredients/server/domain/repositories/shopping-session-repository.interface'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders'

describe('StartShoppingSessionHandler', () => {
  let handler: StartShoppingSessionHandler
  let mockFactory: ShoppingSessionFactory
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

    // ファクトリのモック
    mockFactory = {
      create: vi.fn(),
      createWithCheck: vi.fn(),
    } as any

    handler = new StartShoppingSessionHandler(mockFactory, mockRepository)
  })

  describe('handle', () => {
    it('新しいショッピングセッションを開始できる', async () => {
      // Given: コマンド
      const command = new StartShoppingSessionCommand(userId)

      // セッションのモック
      const mockSession = new ShoppingSessionBuilder().withUserId(userId).build()

      // ファクトリがセッションを作成
      vi.mocked(mockFactory.create).mockResolvedValue(mockSession)

      // リポジトリが保存後のセッションを返す
      vi.mocked(mockRepository.save).mockResolvedValue(mockSession)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: DTOが返される
      expect(result).toBeInstanceOf(ShoppingSessionDto)
      expect(result.sessionId).toBe(mockSession.getId().getValue())
      expect(result.userId).toBe(userId)
      expect(result.status).toBe('ACTIVE')

      // ファクトリとリポジトリが正しく呼ばれた
      expect(mockFactory.create).toHaveBeenCalledWith(userId)
      expect(mockRepository.save).toHaveBeenCalledWith(mockSession)
    })

    it('ファクトリのエラーを伝播する', async () => {
      // Given: コマンド
      const command = new StartShoppingSessionCommand(userId)

      // ファクトリがエラーを投げる
      const error = new Error('アクティブなセッションが既に存在します')
      vi.mocked(mockFactory.create).mockRejectedValue(error)

      // When/Then: エラーが伝播される
      await expect(handler.handle(command)).rejects.toThrow(error)

      // リポジトリは呼ばれない
      expect(mockRepository.save).not.toHaveBeenCalled()
    })

    it('リポジトリのエラーを伝播する', async () => {
      // Given: コマンド
      const command = new StartShoppingSessionCommand(userId)

      // セッションのモック
      const mockSession = new ShoppingSessionBuilder().withUserId(userId).build()

      // ファクトリがセッションを作成
      vi.mocked(mockFactory.create).mockResolvedValue(mockSession)

      // リポジトリがエラーを投げる
      const error = new Error('データベースエラー')
      vi.mocked(mockRepository.save).mockRejectedValue(error)

      // When/Then: エラーが伝播される
      await expect(handler.handle(command)).rejects.toThrow(error)
    })
  })
})
