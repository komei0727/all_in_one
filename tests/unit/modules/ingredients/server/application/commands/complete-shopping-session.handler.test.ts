import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CompleteShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/complete-shopping-session.command'
import { CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { NotFoundException } from '@/modules/ingredients/server/domain/exceptions'
import type { ShoppingSessionRepository } from '@/modules/ingredients/server/domain/repositories/shopping-session-repository.interface'
import {
  SessionStatus,
  ShoppingSessionId,
  IngredientId,
  IngredientName,
  StockStatus,
  ExpiryStatus,
} from '@/modules/ingredients/server/domain/value-objects'
import { CheckedItem } from '@/modules/ingredients/server/domain/value-objects/checked-item.vo'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('CompleteShoppingSessionHandler', () => {
  let handler: CompleteShoppingSessionHandler
  let mockRepository: ShoppingSessionRepository
  let sessionId: string
  let userId: string

  beforeEach(() => {
    sessionId = testDataHelpers.shoppingSessionId()
    userId = faker.string.uuid()

    // リポジトリのモックを作成
    mockRepository = {
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    }

    handler = new CompleteShoppingSessionHandler(mockRepository)
  })

  describe('handle', () => {
    it('アクティブなセッションを完了できる', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // アクティブなセッションのモック
      const activeSession = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(activeSession)

      // complete()メソッドのモック
      const completeSpy = vi.spyOn(activeSession, 'complete')

      // 更新後のセッションを返す
      vi.mocked(mockRepository.update).mockResolvedValue(activeSession)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: DTOが返される
      expect(result).toBeInstanceOf(ShoppingSessionDto)
      expect(result.sessionId).toBe(sessionId)
      expect(result.userId).toBe(userId)

      // セッションのcompleteメソッドが呼ばれた
      expect(completeSpy).toHaveBeenCalled()

      // リポジトリが正しく呼ばれた
      expect(mockRepository.findById).toHaveBeenCalledWith(expect.any(ShoppingSessionId))
      expect(mockRepository.update).toHaveBeenCalledWith(activeSession)
    })

    it('セッションが存在しない場合はNotFoundExceptionを投げる', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // リポジトリがnullを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      // When/Then: NotFoundExceptionが投げられる
      await expect(handler.handle(command)).rejects.toThrow(NotFoundException)
      await expect(handler.handle(command)).rejects.toThrow('買い物セッション not found:')

      // updateは呼ばれない
      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('他のユーザーのセッションは完了できない', async () => {
      // Given: コマンド（別のユーザーIDを指定）
      const otherUserId = faker.string.uuid()
      const command = new CompleteShoppingSessionCommand(sessionId, otherUserId)

      // 別のユーザーのセッションのモック
      const session = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(session)

      // When/Then: エラーが投げられる
      await expect(handler.handle(command)).rejects.toThrow(
        'このセッションを完了する権限がありません'
      )

      // updateは呼ばれない
      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('既に完了したセッションは再度完了できない', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // 完了済みセッションのモック
      const completedSession = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.COMPLETED)
        .withCompletedAt(new Date())
        .build()

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(completedSession)

      // complete()メソッドがエラーを投げる
      vi.spyOn(completedSession, 'complete').mockImplementation(() => {
        throw new Error('セッションは既に完了しています')
      })

      // When/Then: エラーが投げられる
      await expect(handler.handle(command)).rejects.toThrow('セッションは既に完了しています')

      // updateは呼ばれない
      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('リポジトリのエラーを伝播する', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // セッションのモック
      const session = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(session)

      // 更新時にエラーを投げる
      const error = new Error('データベースエラー')
      vi.mocked(mockRepository.update).mockRejectedValue(error)

      // When/Then: エラーが伝播される
      await expect(handler.handle(command)).rejects.toThrow(error)
    })

    it('位置情報付きのセッションを完了できる', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // 位置情報付きセッションのモック
      const sessionWithLocation = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .withLocation(35.6762, 139.6503, 'コンビニ')
        .build()

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(sessionWithLocation)
      vi.mocked(mockRepository.update).mockResolvedValue(sessionWithLocation)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: 位置情報が含まれるDTOが返される
      expect(result.location).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        name: 'コンビニ',
      })
    })

    it('場所名がない位置情報のセッションを完了できる', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // 場所名なしの位置情報付きセッション
      const sessionWithLocation = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .withLocation(35.6762, 139.6503, undefined) // 場所名なし
        .build()

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(sessionWithLocation)
      vi.mocked(mockRepository.update).mockResolvedValue(sessionWithLocation)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: 位置情報のplaceNameがundefinedになる
      expect(result.location).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        placeName: undefined,
      })
    })

    it('チェック済みアイテムがあるセッションを完了できる', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // チェック済みアイテム付きセッション
      const sessionWithItems = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      // チェック済みアイテムを追加
      const checkedItem1 = CheckedItem.create({
        ingredientId: new IngredientId(testDataHelpers.ingredientId()),
        ingredientName: new IngredientName('トマト'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })
      sessionWithItems.checkIngredient(checkedItem1)

      const checkedItem2 = CheckedItem.create({
        ingredientId: new IngredientId(testDataHelpers.ingredientId()),
        ingredientName: new IngredientName('レタス'),
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.EXPIRING_SOON,
      })
      sessionWithItems.checkIngredient(checkedItem2)

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(sessionWithItems)
      vi.mocked(mockRepository.update).mockResolvedValue(sessionWithItems)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: チェック済みアイテムが含まれるDTOが返される
      expect(result.checkedItems).toHaveLength(2)
      expect(result.checkedItems?.[0]).toMatchObject({
        ingredientName: 'トマト',
        stockStatus: 'IN_STOCK',
        expiryStatus: 'FRESH',
      })
      expect(result.checkedItems?.[1]).toMatchObject({
        ingredientName: 'レタス',
        stockStatus: 'LOW_STOCK',
        expiryStatus: 'EXPIRING_SOON',
      })
    })

    it('賞味期限情報がないチェック済みアイテムも正しく処理される', async () => {
      // Given: コマンド
      const command = new CompleteShoppingSessionCommand(sessionId, userId)

      // チェック済みアイテム付きセッション
      const sessionWithItems = new ShoppingSessionBuilder()
        .withId(new ShoppingSessionId(sessionId))
        .withUserId(userId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      // 賞味期限情報なしのアイテムを追加（FRESHとして扱う）
      const checkedItem = CheckedItem.create({
        ingredientId: new IngredientId(testDataHelpers.ingredientId()),
        ingredientName: new IngredientName('塩'),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH, // 期限なしはFRESHとして扱う
      })
      sessionWithItems.checkIngredient(checkedItem)

      // リポジトリがセッションを返す
      vi.mocked(mockRepository.findById).mockResolvedValue(sessionWithItems)
      vi.mocked(mockRepository.update).mockResolvedValue(sessionWithItems)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: 賞味期限情報がFRESHのアイテムが含まれる
      expect(result.checkedItems).toHaveLength(1)
      expect(result.checkedItems?.[0]).toMatchObject({
        ingredientName: '塩',
        stockStatus: 'IN_STOCK',
        expiryStatus: 'FRESH',
      })
    })
  })
})
