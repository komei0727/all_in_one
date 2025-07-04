import { GetProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/get-profile.handler'
import { UpdateProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/update-profile.handler'

import { AbandonShoppingSessionApiHandler } from './handlers/commands/abandon-shopping-session.handler'
import { CheckIngredientApiHandler } from './handlers/commands/check-ingredient.handler'
import { CompleteShoppingSessionApiHandler } from './handlers/commands/complete-shopping-session.handler'
import { CreateIngredientApiHandler } from './handlers/commands/create-ingredient.handler'
import { DeleteIngredientApiHandler } from './handlers/commands/delete-ingredient.handler'
import { StartShoppingSessionApiHandler } from './handlers/commands/start-shopping-session.handler'
import { UpdateIngredientApiHandler } from './handlers/commands/update-ingredient.handler'
import { GetActiveShoppingSessionApiHandler } from './handlers/queries/get-active-shopping-session.handler'
import { GetCategoriesApiHandler } from './handlers/queries/get-categories.handler'
import { GetIngredientByIdApiHandler } from './handlers/queries/get-ingredient-by-id.handler'
import { GetIngredientCheckStatisticsApiHandler } from './handlers/queries/get-ingredient-check-statistics.handler'
import { GetIngredientsByCategoryApiHandler } from './handlers/queries/get-ingredients-by-category.handler'
import { GetIngredientsApiHandler } from './handlers/queries/get-ingredients.handler'
import { GetQuickAccessIngredientsApiHandler } from './handlers/queries/get-quick-access-ingredients.handler'
import { GetRecentSessionsApiHandler } from './handlers/queries/get-recent-sessions.handler'
import { GetSessionHistoryApiHandler } from './handlers/queries/get-session-history.handler'
import { GetShoppingStatisticsApiHandler } from './handlers/queries/get-shopping-statistics.handler'
import { GetUnitsApiHandler } from './handlers/queries/get-units.handler'

import type { ApplicationCompositionRoot } from '../application/application-composition-root'

/**
 * API層のComposition Root
 * APIハンドラーの組み立てを担当
 */
export class ApiCompositionRoot {
  constructor(private readonly application: ApplicationCompositionRoot) {}

  // コマンドAPIハンドラー
  getCreateIngredientApiHandler(): CreateIngredientApiHandler {
    return new CreateIngredientApiHandler(this.application.getCreateIngredientHandler())
  }

  getUpdateIngredientApiHandler(): UpdateIngredientApiHandler {
    return new UpdateIngredientApiHandler(this.application.getUpdateIngredientHandler())
  }

  getDeleteIngredientApiHandler(): DeleteIngredientApiHandler {
    return new DeleteIngredientApiHandler(this.application.getDeleteIngredientHandler())
  }

  getStartShoppingSessionApiHandler(): StartShoppingSessionApiHandler {
    return new StartShoppingSessionApiHandler(this.application.getStartShoppingSessionHandler())
  }

  getCompleteShoppingSessionApiHandler(): CompleteShoppingSessionApiHandler {
    return new CompleteShoppingSessionApiHandler(
      this.application.getCompleteShoppingSessionHandler()
    )
  }

  getAbandonShoppingSessionApiHandler(): AbandonShoppingSessionApiHandler {
    return new AbandonShoppingSessionApiHandler(this.application.getAbandonShoppingSessionHandler())
  }

  getCheckIngredientApiHandler(): CheckIngredientApiHandler {
    return new CheckIngredientApiHandler(this.application.getCheckIngredientHandler())
  }

  // クエリAPIハンドラー
  getGetCategoriesApiHandler(): GetCategoriesApiHandler {
    return new GetCategoriesApiHandler(this.application.getGetCategoriesQueryHandler())
  }

  getGetUnitsApiHandler(): GetUnitsApiHandler {
    return new GetUnitsApiHandler(this.application.getGetUnitsQueryHandler())
  }

  getGetIngredientsApiHandler(): GetIngredientsApiHandler {
    return new GetIngredientsApiHandler(this.application.getGetIngredientsHandler())
  }

  getGetIngredientByIdApiHandler(): GetIngredientByIdApiHandler {
    return new GetIngredientByIdApiHandler(this.application.getGetIngredientByIdHandler())
  }

  getGetActiveShoppingSessionApiHandler(): GetActiveShoppingSessionApiHandler {
    return new GetActiveShoppingSessionApiHandler(
      this.application.getGetActiveShoppingSessionHandler()
    )
  }

  getGetRecentSessionsApiHandler(): GetRecentSessionsApiHandler {
    return new GetRecentSessionsApiHandler(this.application.getGetRecentSessionsHandler())
  }

  getGetShoppingStatisticsApiHandler(): GetShoppingStatisticsApiHandler {
    return new GetShoppingStatisticsApiHandler(this.application.getGetShoppingStatisticsHandler())
  }

  getGetQuickAccessIngredientsApiHandler(): GetQuickAccessIngredientsApiHandler {
    return new GetQuickAccessIngredientsApiHandler(
      this.application.getGetQuickAccessIngredientsHandler()
    )
  }

  getGetIngredientCheckStatisticsApiHandler(): GetIngredientCheckStatisticsApiHandler {
    return new GetIngredientCheckStatisticsApiHandler(
      this.application.getGetIngredientCheckStatisticsHandler()
    )
  }

  getIngredientsByCategoryApiHandler(): GetIngredientsByCategoryApiHandler {
    return new GetIngredientsByCategoryApiHandler(
      this.application.getGetIngredientsByCategoryHandler()
    )
  }

  getGetSessionHistoryApiHandler(): GetSessionHistoryApiHandler {
    return new GetSessionHistoryApiHandler(this.application.getGetSessionHistoryHandler())
  }

  // 他モジュールのAPIハンドラー
  getGetProfileApiHandler(): GetProfileApiHandler {
    return new GetProfileApiHandler(this.application.getUserApplicationService())
  }

  getUpdateProfileApiHandler(): UpdateProfileApiHandler {
    return new UpdateProfileApiHandler(this.application.getUserApplicationService())
  }
}
