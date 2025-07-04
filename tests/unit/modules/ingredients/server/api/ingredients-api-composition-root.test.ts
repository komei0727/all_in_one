import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient } from '@/generated/prisma'
import { CreateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/create-ingredient.handler'
import { StartShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler'
import { GetCategoriesApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-categories.handler'
import { GetUnitsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-units.handler'
import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'

// Mock Prisma Client
vi.mock('@/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}))

describe('IngredientsApiCompositionRoot', () => {
  let compositionRoot: IngredientsApiCompositionRoot
  let mockPrismaClient: PrismaClient

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    mockPrismaClient = new PrismaClient()
    compositionRoot = new IngredientsApiCompositionRoot(mockPrismaClient)
  })

  describe('Query API handler creation', () => {
    it('カテゴリー取得APIハンドラーを作成できる', () => {
      // Act
      const handler = compositionRoot.getGetCategoriesApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetCategoriesApiHandler)
    })

    it('単位取得APIハンドラーを作成できる', () => {
      // Act
      const handler = compositionRoot.getGetUnitsApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetUnitsApiHandler)
    })

    it('呼び出しごとに新しいAPIハンドラーインスタンスを返す', () => {
      // Act
      const handler1 = compositionRoot.getGetCategoriesApiHandler()
      const handler2 = compositionRoot.getGetCategoriesApiHandler()

      // Assert
      expect(handler1).not.toBe(handler2) // API handlers should be new instances
    })
  })

  describe('Command API handler creation', () => {
    it('食材作成APIハンドラーを作成できる', () => {
      // Act
      const handler = compositionRoot.getCreateIngredientApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(CreateIngredientApiHandler)
    })

    it('買い物セッション開始APIハンドラーを作成できる', () => {
      // Act
      const handler = compositionRoot.getStartShoppingSessionApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(StartShoppingSessionApiHandler)
    })
  })

  describe('Static factory method', () => {
    it('getInstanceでシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const instance1 = IngredientsApiCompositionRoot.getInstance()
      const instance2 = IngredientsApiCompositionRoot.getInstance()

      // Assert
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(IngredientsApiCompositionRoot)
    })

    it('resetInstanceでテスト用にインスタンスをリセットできる', () => {
      // Act
      const instance1 = IngredientsApiCompositionRoot.getInstance()
      IngredientsApiCompositionRoot.resetInstance() // For testing purposes
      const instance2 = IngredientsApiCompositionRoot.getInstance()

      // Assert
      expect(instance1).not.toBe(instance2)
    })
  })

  describe('Complete API handler coverage', () => {
    it('全てのAPIハンドラーメソッドが定義されている', () => {
      // Assert - すべてのメソッドが定義されていることを確認
      expect(typeof compositionRoot.getGetCategoriesApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetUnitsApiHandler).toBe('function')
      expect(typeof compositionRoot.getCreateIngredientApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetIngredientsApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetIngredientByIdApiHandler).toBe('function')
      expect(typeof compositionRoot.getUpdateIngredientApiHandler).toBe('function')
      expect(typeof compositionRoot.getDeleteIngredientApiHandler).toBe('function')
      expect(typeof compositionRoot.getStartShoppingSessionApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetActiveShoppingSessionApiHandler).toBe('function')
      expect(typeof compositionRoot.getCompleteShoppingSessionApiHandler).toBe('function')
      expect(typeof compositionRoot.getAbandonShoppingSessionApiHandler).toBe('function')
      expect(typeof compositionRoot.getCheckIngredientApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetRecentSessionsApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetShoppingStatisticsApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetQuickAccessIngredientsApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetIngredientCheckStatisticsApiHandler).toBe('function')
      expect(typeof compositionRoot.getIngredientsByCategoryApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetSessionHistoryApiHandler).toBe('function')
      expect(typeof compositionRoot.getGetProfileApiHandler).toBe('function')
      expect(typeof compositionRoot.getUpdateProfileApiHandler).toBe('function')
    })
  })
})
