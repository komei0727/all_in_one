import type { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'

import { ApiCompositionRoot } from './api/api-composition-root'
import { ApplicationCompositionRoot } from './application/application-composition-root'
import { InfrastructureCompositionRoot } from './infrastructure/infrastructure-composition-root'

/**
 * Ingredients モジュールのComposition Root
 *
 * モジュール全体の統一的なエントリーポイント
 * 内部でレイヤー別Composition Rootを管理し、APIハンドラーを提供
 * DDDアーキテクチャに従い、横断的関心事としてモジュールルートに配置
 */
export class IngredientsApiCompositionRoot {
  private static instance: IngredientsApiCompositionRoot | null = null
  private apiRoot: ApiCompositionRoot

  constructor(prismaClient: PrismaClient) {
    // レイヤー別Composition Rootの初期化
    const infraRoot = new InfrastructureCompositionRoot(prismaClient)
    const appRoot = new ApplicationCompositionRoot(infraRoot)
    this.apiRoot = new ApiCompositionRoot(appRoot)
  }

  /**
   * シングルトンインスタンスの取得
   */
  public static getInstance(prismaClient?: PrismaClient): IngredientsApiCompositionRoot {
    if (!IngredientsApiCompositionRoot.instance) {
      const client = prismaClient || prisma
      IngredientsApiCompositionRoot.instance = new IngredientsApiCompositionRoot(client)
    }
    return IngredientsApiCompositionRoot.instance
  }

  /**
   * テスト用にインスタンスをリセット
   */
  public static resetInstance(): void {
    IngredientsApiCompositionRoot.instance = null
  }

  // API層のハンドラーメソッドを委譲
  public getGetCategoriesApiHandler() {
    return this.apiRoot.getGetCategoriesApiHandler()
  }

  public getGetUnitsApiHandler() {
    return this.apiRoot.getGetUnitsApiHandler()
  }

  public getCreateIngredientApiHandler() {
    return this.apiRoot.getCreateIngredientApiHandler()
  }

  public getGetIngredientsApiHandler() {
    return this.apiRoot.getGetIngredientsApiHandler()
  }

  public getGetIngredientByIdApiHandler() {
    return this.apiRoot.getGetIngredientByIdApiHandler()
  }

  public getUpdateIngredientApiHandler() {
    return this.apiRoot.getUpdateIngredientApiHandler()
  }

  public getDeleteIngredientApiHandler() {
    return this.apiRoot.getDeleteIngredientApiHandler()
  }

  public getStartShoppingSessionApiHandler() {
    return this.apiRoot.getStartShoppingSessionApiHandler()
  }

  public getGetActiveShoppingSessionApiHandler() {
    return this.apiRoot.getGetActiveShoppingSessionApiHandler()
  }

  public getCompleteShoppingSessionApiHandler() {
    return this.apiRoot.getCompleteShoppingSessionApiHandler()
  }

  public getAbandonShoppingSessionApiHandler() {
    return this.apiRoot.getAbandonShoppingSessionApiHandler()
  }

  public getCheckIngredientApiHandler() {
    return this.apiRoot.getCheckIngredientApiHandler()
  }

  public getGetRecentSessionsApiHandler() {
    return this.apiRoot.getGetRecentSessionsApiHandler()
  }

  public getGetShoppingStatisticsApiHandler() {
    return this.apiRoot.getGetShoppingStatisticsApiHandler()
  }

  public getGetQuickAccessIngredientsApiHandler() {
    return this.apiRoot.getGetQuickAccessIngredientsApiHandler()
  }

  public getGetIngredientCheckStatisticsApiHandler() {
    return this.apiRoot.getGetIngredientCheckStatisticsApiHandler()
  }

  public getIngredientsByCategoryApiHandler() {
    return this.apiRoot.getIngredientsByCategoryApiHandler()
  }

  public getGetSessionHistoryApiHandler() {
    return this.apiRoot.getGetSessionHistoryApiHandler()
  }

  public getGetProfileApiHandler() {
    return this.apiRoot.getGetProfileApiHandler()
  }

  public getUpdateProfileApiHandler() {
    return this.apiRoot.getUpdateProfileApiHandler()
  }
}
