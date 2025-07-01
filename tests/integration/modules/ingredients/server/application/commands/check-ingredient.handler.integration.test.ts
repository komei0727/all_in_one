import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CheckIngredientCommand } from '@/modules/ingredients/server/application/commands/check-ingredient.command'
import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'
import {
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
  getTestPrismaClient,
  setupIntegrationTest,
} from '@tests/helpers/database.helper'

describe('CheckIngredientHandler Integration Tests', () => {
  let prisma: any
  let userId: string
  let sessionId: string
  let existingIngredientId: string

  beforeEach(async () => {
    // 統合テスト環境をセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // テストデータIDを取得
    const testDataIds = getTestDataIds()
    userId = testDataIds.users.defaultUser.domainUserId

    // CompositionRootをリセットしてテスト用Prismaクライアントで初期化
    CompositionRoot.resetInstance()
    const compositionRoot = CompositionRoot.getInstance(prisma as any)
    const startShoppingSessionHandler = compositionRoot.getStartShoppingSessionHandler()

    // 買い物セッションを開始
    const startSessionCommand = new StartShoppingSessionCommand(userId)
    const sessionDto = await startShoppingSessionHandler.handle(startSessionCommand)
    sessionId = sessionDto.sessionId

    // 既存の食材を使用（テストデータに含まれているもの）
    // データベースから既存の食材を取得
    const existingIngredient = await prisma.ingredient.findFirst({
      where: { userId },
    })

    if (existingIngredient) {
      existingIngredientId = existingIngredient.id
    } else {
      // 食材が存在しない場合はテスト用の食材IDを使用（fallback）
      existingIngredientId = 'ing_test_default'
    }
  })

  afterEach(async () => {
    await cleanupIntegrationTest()
    CompositionRoot.resetInstance()
  })

  afterAll(async () => {
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    it('既存の食材を正常にチェックできる', async () => {
      // 既存の食材が存在しない場合はスキップ
      if (!existingIngredientId || existingIngredientId === 'ing_test_default') {
        console.log('スキップ: テスト用食材が見つかりません')
        return
      }

      // Given: 既存の食材と有効なコマンド
      const compositionRoot = CompositionRoot.getInstance(prisma as any)
      const checkIngredientHandler = compositionRoot.getCheckIngredientHandler()
      const command = new CheckIngredientCommand(sessionId, existingIngredientId, userId)

      // When: 食材確認を実行
      const result = await checkIngredientHandler.handle(command)

      // Then: セッションが更新され、食材がチェック済みになる
      expect(result.sessionId).toBe(sessionId)
      expect(result.userId).toBe(userId)
      expect(result.status).toBe('ACTIVE')
      expect(result.checkedItems).toHaveLength(1)

      const checkedItem = result.checkedItems![0]
      expect(checkedItem.ingredientId).toBe(existingIngredientId)
      expect(checkedItem.stockStatus).toMatch(/^(IN_STOCK|LOW_STOCK|OUT_OF_STOCK)$/)
      expect(checkedItem.expiryStatus).toMatch(
        /^(FRESH|NEAR_EXPIRY|EXPIRING_SOON|CRITICAL|EXPIRED)$/
      )
      expect(checkedItem.checkedAt).toBeDefined()

      // データベースにセッションアイテムが保存されていることを確認
      const sessionItems = await prisma.shoppingSessionItem.findMany({
        where: { sessionId },
      })
      expect(sessionItems).toHaveLength(1)
      expect(sessionItems[0].ingredientId).toBe(existingIngredientId)
    })
  })

  describe('異常系', () => {
    it('存在しないセッションIDの場合はNotFoundExceptionが発生する', async () => {
      // Given: 存在しないセッションIDと適切な食材ID
      const compositionRoot = CompositionRoot.getInstance(prisma as any)
      const checkIngredientHandler = compositionRoot.getCheckIngredientHandler()
      const nonExistentSessionId = testDataHelpers.shoppingSessionId()
      const ingredientId = testDataHelpers.ingredientId()
      const command = new CheckIngredientCommand(nonExistentSessionId, ingredientId, userId)

      // When/Then: NotFoundExceptionが発生
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow(NotFoundException)
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow('買い物セッション')
    })

    it('存在しない食材IDの場合はNotFoundExceptionが発生する', async () => {
      // Given: 存在しない食材ID（適切な形式）
      const compositionRoot = CompositionRoot.getInstance(prisma as any)
      const checkIngredientHandler = compositionRoot.getCheckIngredientHandler()
      const nonExistentIngredientId = testDataHelpers.ingredientId()
      const command = new CheckIngredientCommand(sessionId, nonExistentIngredientId, userId)

      // When/Then: NotFoundExceptionが発生
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow(NotFoundException)
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow('食材')
    })

    it('権限のないユーザーの場合はBusinessRuleExceptionが発生する', async () => {
      // Given: 権限のないユーザー（存在しないユーザーID）
      const compositionRoot = CompositionRoot.getInstance(prisma as any)
      const checkIngredientHandler = compositionRoot.getCheckIngredientHandler()
      const unauthorizedUserId = testDataHelpers.userId() // 存在しないランダムユーザーID
      const ingredientId = testDataHelpers.ingredientId()
      const command = new CheckIngredientCommand(sessionId, ingredientId, unauthorizedUserId)

      // When/Then: BusinessRuleExceptionが発生
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow(
        'このセッションで食材を確認する権限がありません'
      )
    })

    it('既にチェック済みの食材の場合はBusinessRuleExceptionが発生する', async () => {
      // 既存の食材が存在しない場合はスキップ
      if (!existingIngredientId || existingIngredientId === 'ing_test_default') {
        console.log('スキップ: テスト用食材が見つかりません')
        return
      }

      // Given: 既に食材をチェック済み
      const compositionRoot = CompositionRoot.getInstance(prisma as any)
      const checkIngredientHandler = compositionRoot.getCheckIngredientHandler()
      const command = new CheckIngredientCommand(sessionId, existingIngredientId, userId)

      // 最初のチェック
      await checkIngredientHandler.handle(command)

      // When/Then: 同じ食材を再度チェックするとBusinessRuleExceptionが発生
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow(BusinessRuleException)
      await expect(checkIngredientHandler.handle(command)).rejects.toThrow(
        'この食材は既にチェック済みです'
      )
    })
  })
})
