import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient } from '@/generated/prisma'
import { ApplicationCompositionRoot } from '@/modules/ingredients/server/application/application-composition-root'
import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { StartShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/start-shopping-session.handler'
import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories.handler'
import { GetUnitsQueryHandler } from '@/modules/ingredients/server/application/queries/get-units.handler'
import { InfrastructureCompositionRoot } from '@/modules/ingredients/server/infrastructure/infrastructure-composition-root'

// Mock Prisma Client
vi.mock('@/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}))

describe('ApplicationCompositionRoot', () => {
  let appRoot: ApplicationCompositionRoot
  let infraRoot: InfrastructureCompositionRoot
  let mockPrismaClient: PrismaClient

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    mockPrismaClient = new PrismaClient()
    infraRoot = new InfrastructureCompositionRoot(mockPrismaClient)
    appRoot = new ApplicationCompositionRoot(infraRoot)
  })

  describe('Query handler creation', () => {
    it('カテゴリー取得クエリハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = appRoot.getGetCategoriesQueryHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetCategoriesQueryHandler)
    })

    it('単位取得クエリハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = appRoot.getGetUnitsQueryHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetUnitsQueryHandler)
    })

    it('呼び出しごとに新しいハンドラーインスタンスを返す', () => {
      // Act
      const handler1 = appRoot.getGetCategoriesQueryHandler()
      const handler2 = appRoot.getGetCategoriesQueryHandler()

      // Assert
      expect(handler1).not.toBe(handler2) // Handlers should be new instances
    })
  })

  describe('Command handler creation', () => {
    it('食材作成コマンドハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = appRoot.getCreateIngredientHandler()

      // Assert
      expect(handler).toBeInstanceOf(CreateIngredientHandler)
    })

    it('買い物セッション開始コマンドハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = appRoot.getStartShoppingSessionHandler()

      // Assert
      expect(handler).toBeInstanceOf(StartShoppingSessionHandler)
    })

    it('呼び出しごとに新しいハンドラーインスタンスを返す', () => {
      // Act
      const handler1 = appRoot.getCreateIngredientHandler()
      const handler2 = appRoot.getCreateIngredientHandler()

      // Assert
      expect(handler1).not.toBe(handler2) // Handlers should be new instances
    })
  })

  describe('Factory creation', () => {
    it('買い物セッションファクトリーを作成できる', () => {
      // Act
      const factory = appRoot.getShoppingSessionFactory()

      // Assert
      expect(factory).toBeDefined()
    })
  })

  describe('External service integration', () => {
    it('ユーザーアプリケーションサービスを取得できる', () => {
      // Act
      const service = appRoot.getUserApplicationService()

      // Assert
      expect(service).toBeDefined()
    })
  })
})
