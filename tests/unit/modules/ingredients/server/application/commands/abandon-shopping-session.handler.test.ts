import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AbandonShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/abandon-shopping-session.command'
import { AbandonShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/abandon-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects'

/**
 * AbandonShoppingSessionHandler の単体テスト
 * 買い物セッション中断のビジネスロジックを検証
 */
describe('AbandonShoppingSessionHandler', () => {
  let handler: AbandonShoppingSessionHandler
  let mockRepository: any
  let mockSession: any
  const validSessionId = ShoppingSessionId.create().getValue() // 有効なセッションIDを生成

  beforeEach(() => {
    // リポジトリのモック
    mockRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    }

    // セッションのモック
    mockSession = {
      getId: vi.fn().mockReturnValue({
        getValue: () => validSessionId,
      }),
      getUserId: vi.fn().mockReturnValue('user123'),
      getStatus: vi.fn().mockReturnValue({
        getValue: () => 'ACTIVE',
      }),
      getStartedAt: vi.fn().mockReturnValue(new Date('2024-01-01T10:00:00Z')),
      getCompletedAt: vi.fn().mockReturnValue(null),
      getDeviceType: vi.fn().mockReturnValue(null),
      getLocation: vi.fn().mockReturnValue(null),
      abandon: vi.fn(),
    }

    handler = new AbandonShoppingSessionHandler(mockRepository)
  })

  describe('正常系', () => {
    it('アクティブなセッションを中断できる', async () => {
      // Given: アクティブなセッション
      mockRepository.findById.mockResolvedValue(mockSession)
      mockRepository.update.mockResolvedValue(mockSession)

      const command = new AbandonShoppingSessionCommand(validSessionId, 'user123', undefined)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: セッションが中断される
      expect(mockSession.abandon).toHaveBeenCalledWith(undefined)
      expect(mockRepository.update).toHaveBeenCalledWith(mockSession)
      expect(result).toBeInstanceOf(ShoppingSessionDto)
    })

    it('中断理由を指定してセッションを中断できる', async () => {
      // Given: アクティブなセッション
      mockRepository.findById.mockResolvedValue(mockSession)
      mockRepository.update.mockResolvedValue(mockSession)

      const reason = 'user-cancelled'
      const command = new AbandonShoppingSessionCommand(validSessionId, 'user123', reason)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: 指定した理由でセッションが中断される
      expect(mockSession.abandon).toHaveBeenCalledWith(reason)
      expect(mockRepository.update).toHaveBeenCalledWith(mockSession)
      expect(result).toBeInstanceOf(ShoppingSessionDto)
    })
  })

  describe('異常系', () => {
    it('存在しないセッションの場合はNotFoundExceptionをスローする', async () => {
      // Given: セッションが存在しない
      mockRepository.findById.mockResolvedValue(null)

      const nonExistentId = ShoppingSessionId.create().getValue()
      const command = new AbandonShoppingSessionCommand(nonExistentId, 'user123', undefined)

      // When/Then: NotFoundExceptionがスローされる
      await expect(handler.handle(command)).rejects.toThrow(NotFoundException)
      await expect(handler.handle(command)).rejects.toThrow('買い物セッション not found')
    })

    it('他のユーザーのセッションの場合はNotFoundExceptionをスローする', async () => {
      // Given: 他のユーザーのセッション
      mockSession.getUserId.mockReturnValue('other-user')
      mockRepository.findById.mockResolvedValue(mockSession)

      const command = new AbandonShoppingSessionCommand(validSessionId, 'user123', undefined)

      // When/Then: NotFoundExceptionがスローされる（権限エラーを隠蔽）
      await expect(handler.handle(command)).rejects.toThrow(NotFoundException)
      await expect(handler.handle(command)).rejects.toThrow('買い物セッション not found')
    })

    it('既に完了したセッションの場合はBusinessRuleExceptionをスローする', async () => {
      // Given: 完了したセッション
      mockSession.abandon.mockImplementation(() => {
        throw new BusinessRuleException('アクティブでないセッションは中断できません')
      })
      mockRepository.findById.mockResolvedValue(mockSession)

      const command = new AbandonShoppingSessionCommand(validSessionId, 'user123', undefined)

      // When/Then: BusinessRuleExceptionがスローされる
      await expect(handler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(handler.handle(command)).rejects.toThrow(
        'アクティブでないセッションは中断できません'
      )
    })

    it('既に中断されたセッションの場合はBusinessRuleExceptionをスローする', async () => {
      // Given: 中断されたセッション
      mockSession.abandon.mockImplementation(() => {
        throw new BusinessRuleException('アクティブでないセッションは中断できません')
      })
      mockRepository.findById.mockResolvedValue(mockSession)

      const command = new AbandonShoppingSessionCommand(validSessionId, 'user123', undefined)

      // When/Then: BusinessRuleExceptionがスローされる
      await expect(handler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(handler.handle(command)).rejects.toThrow(
        'アクティブでないセッションは中断できません'
      )
    })
  })

  describe('バリデーション', () => {
    it('無効なセッションID形式の場合はエラーになる', async () => {
      // Given: 無効なセッションID
      const command = new AbandonShoppingSessionCommand('invalid-id', 'user123', undefined)

      // When/Then: バリデーションエラーがスローされる
      await expect(handler.handle(command)).rejects.toThrow()
    })
  })
})
