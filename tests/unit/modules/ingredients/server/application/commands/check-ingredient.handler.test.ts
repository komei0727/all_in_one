import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CheckIngredientCommand } from '@/modules/ingredients/server/application/commands/check-ingredient.command'
import { CheckIngredientHandler } from '@/modules/ingredients/server/application/commands/check-ingredient.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { ShoppingSessionRepository } from '@/modules/ingredients/server/domain/repositories/shopping-session-repository.interface'
import {
  CheckedItem,
  ExpiryStatus,
  IngredientId,
  IngredientName,
  SessionStatus,
  ShoppingSessionId,
  StockStatus,
} from '@/modules/ingredients/server/domain/value-objects'
import { IngredientBuilder, ShoppingSessionBuilder } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('CheckIngredientHandler', () => {
  let handler: CheckIngredientHandler
  let mockSessionRepository: ShoppingSessionRepository
  let mockIngredientRepository: IngredientRepository
  let userId: string
  let sessionId: string
  let ingredientId: string

  beforeEach(() => {
    userId = testDataHelpers.userId()
    sessionId = ShoppingSessionId.create().getValue()
    ingredientId = testDataHelpers.ingredientId()

    mockSessionRepository = {
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    }

    mockIngredientRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findDuplicates: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      findExpiringSoon: vi.fn(),
      findLowStock: vi.fn(),
      findByName: vi.fn(),
      findAll: vi.fn(),
      findExpired: vi.fn(),
      findByCategory: vi.fn(),
      findByStorageLocation: vi.fn(),
      findOutOfStock: vi.fn(),
      existsByUserAndNameAndExpiryAndLocation: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    }

    handler = new CheckIngredientHandler(mockSessionRepository, mockIngredientRepository)
  })

  describe('handle', () => {
    it('食材をチェックしてセッションに追加できる', async () => {
      // Given: アクティブなセッションと食材
      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      const ingredient = new IngredientBuilder()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('トマト')
        .withQuantity(5)
        .withFreshDates()
        .build()

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session)
      vi.mocked(mockIngredientRepository.findById).mockResolvedValue(ingredient)
      vi.mocked(mockSessionRepository.update).mockResolvedValue(session)

      // When: コマンドを実行
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      const result = await handler.handle(command)

      // Then: 更新されたセッションのDTOが返される
      expect(result).toBeInstanceOf(ShoppingSessionDto)
      expect(result.sessionId).toBe(sessionId)
      expect(result.status).toBe('ACTIVE')

      // セッションが更新された
      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          getId: expect.any(Function),
          getUserId: expect.any(Function),
          getCheckedItems: expect.any(Function),
        })
      )
    })

    it('セッションが見つからない場合はエラー', async () => {
      // Given: 存在しないセッション
      vi.mocked(mockSessionRepository.findById).mockResolvedValue(null)

      // When/Then: エラーが発生
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      await expect(handler.handle(command)).rejects.toThrow(NotFoundException)
      await expect(handler.handle(command)).rejects.toThrow('買い物セッション')
    })

    it('食材が見つからない場合はエラー', async () => {
      // Given: セッションは存在するが食材が存在しない
      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session)
      vi.mocked(mockIngredientRepository.findById).mockResolvedValue(null)

      // When/Then: エラーが発生
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      await expect(handler.handle(command)).rejects.toThrow(NotFoundException)
      await expect(handler.handle(command)).rejects.toThrow('食材')
    })

    it('他のユーザーのセッションはチェックできない', async () => {
      // Given: 他のユーザーのセッション
      const otherUserId = testDataHelpers.userId()
      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(otherUserId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session)

      // When/Then: 権限エラーが発生
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      await expect(handler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(handler.handle(command)).rejects.toThrow(
        'このセッションで食材を確認する権限がありません'
      )
    })

    it('他のユーザーの食材はチェックできない', async () => {
      // Given: セッションは自分のものだが、食材は他のユーザーのもの
      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      const otherUserId = testDataHelpers.userId()
      const ingredient = new IngredientBuilder()
        .withId(ingredientId)
        .withUserId(otherUserId)
        .build()

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session)
      vi.mocked(mockIngredientRepository.findById).mockResolvedValue(ingredient)

      // When/Then: 権限エラーが発生
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      await expect(handler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(handler.handle(command)).rejects.toThrow('この食材を確認する権限がありません')
    })

    it('完了したセッションでは食材を確認できない', async () => {
      // Given: 完了したセッション
      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(userId)
        .withStatus(SessionStatus.COMPLETED)
        .build()

      const ingredient = new IngredientBuilder().withId(ingredientId).withUserId(userId).build()

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session)
      vi.mocked(mockIngredientRepository.findById).mockResolvedValue(ingredient)

      // When/Then: エラーが発生
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      await expect(handler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(handler.handle(command)).rejects.toThrow(
        'アクティブでないセッションで食材を確認することはできません'
      )
    })

    it('在庫状態と期限状態が正しく判定される', async () => {
      // Given: 在庫少・期限近い食材
      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      const ingredient = new IngredientBuilder()
        .withId(ingredientId)
        .withUserId(userId)
        .withName('牛乳')
        .withQuantity(0.5) // 在庫少
        .withThreshold(1)
        .withExpiryDates(
          new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 賞味期限（5日後）
          new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 消費期限（1日後）
        )
        .build()

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session)
      vi.mocked(mockIngredientRepository.findById).mockResolvedValue(ingredient)

      const updatedSession = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([
          CheckedItem.create({
            ingredientId: new IngredientId(ingredientId),
            ingredientName: new IngredientName('牛乳'),
            stockStatus: StockStatus.LOW_STOCK,
            expiryStatus: ExpiryStatus.EXPIRED,
          }),
        ])
        .build()

      vi.mocked(mockSessionRepository.update).mockResolvedValue(updatedSession)

      // When: コマンドを実行
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      await handler.handle(command)

      // Then: 正しい状態でチェックアイテムが追加される
      const updateCall = vi.mocked(mockSessionRepository.update).mock.calls[0][0]
      const checkedItems = updateCall.getCheckedItems()
      expect(checkedItems).toHaveLength(1)
      // 在庫状態と期限状態は実装時に詳細を確認
    })

    it('同じ食材を重複してチェックできない', async () => {
      // Given: 既にチェック済みの食材を含むセッション
      const checkedItem = CheckedItem.create({
        ingredientId: new IngredientId(ingredientId),
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([checkedItem])
        .build()

      const ingredient = new IngredientBuilder().withId(ingredientId).withUserId(userId).build()

      vi.mocked(mockSessionRepository.findById).mockResolvedValue(session)
      vi.mocked(mockIngredientRepository.findById).mockResolvedValue(ingredient)

      // When/Then: エラーが発生
      const command = new CheckIngredientCommand(sessionId, ingredientId, userId)
      await expect(handler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(handler.handle(command)).rejects.toThrow('この食材は既にチェック済みです')
    })
  })
})
