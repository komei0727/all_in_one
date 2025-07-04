import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient } from '@/generated/prisma'
import { ApiCompositionRoot } from '@/modules/ingredients/server/api/api-composition-root'
import { CreateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/create-ingredient.handler'
import { StartShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler'
import { GetCategoriesApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-categories.handler'
import { GetUnitsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-units.handler'
import { ApplicationCompositionRoot } from '@/modules/ingredients/server/application/application-composition-root'
import { InfrastructureCompositionRoot } from '@/modules/ingredients/server/infrastructure/infrastructure-composition-root'

// Mock Prisma Client
vi.mock('@/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}))

describe('ApiCompositionRoot', () => {
  let apiRoot: ApiCompositionRoot
  let appRoot: ApplicationCompositionRoot
  let infraRoot: InfrastructureCompositionRoot
  let mockPrismaClient: PrismaClient

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    mockPrismaClient = new PrismaClient()
    infraRoot = new InfrastructureCompositionRoot(mockPrismaClient)
    appRoot = new ApplicationCompositionRoot(infraRoot)
    apiRoot = new ApiCompositionRoot(appRoot)
  })

  describe('Query API handler creation', () => {
    it('カテゴリー取得APIハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = apiRoot.getGetCategoriesApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetCategoriesApiHandler)
    })

    it('単位取得APIハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = apiRoot.getGetUnitsApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetUnitsApiHandler)
    })

    it('呼び出しごとに新しいAPIハンドラーインスタンスを返す', () => {
      // Act
      const handler1 = apiRoot.getGetCategoriesApiHandler()
      const handler2 = apiRoot.getGetCategoriesApiHandler()

      // Assert
      expect(handler1).not.toBe(handler2) // API handlers should be new instances
    })
  })

  describe('Command API handler creation', () => {
    it('食材作成APIハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = apiRoot.getCreateIngredientApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(CreateIngredientApiHandler)
    })

    it('買い物セッション開始APIハンドラーを適切な依存関係で作成できる', () => {
      // Act
      const handler = apiRoot.getStartShoppingSessionApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(StartShoppingSessionApiHandler)
    })

    it('呼び出しごとに新しいAPIハンドラーインスタンスを返す', () => {
      // Act
      const handler1 = apiRoot.getCreateIngredientApiHandler()
      const handler2 = apiRoot.getCreateIngredientApiHandler()

      // Assert
      expect(handler1).not.toBe(handler2) // API handlers should be new instances
    })
  })

  describe('External module API handler creation', () => {
    it('プロフィール取得APIハンドラーを取得できる', () => {
      // Act
      const handler = apiRoot.getGetProfileApiHandler()

      // Assert
      expect(handler).toBeDefined()
    })

    it('プロフィール更新APIハンドラーを取得できる', () => {
      // Act
      const handler = apiRoot.getUpdateProfileApiHandler()

      // Assert
      expect(handler).toBeDefined()
    })
  })
})
