/**
 * テストデータビルダーのエクスポート
 */

// 基底クラス
export { BaseBuilder } from './base.builder'

// Faker設定
export { faker, testDataHelpers, JAPANESE_INGREDIENTS, STORAGE_LOCATIONS } from './faker.config'

// 値オブジェクトビルダー
export {
  IngredientNameBuilder,
  QuantityBuilder,
  PriceBuilder,
  StorageLocationBuilder,
  MemoBuilder,
  CategoryNameBuilder,
  UnitNameBuilder,
  UnitSymbolBuilder,
  DisplayOrderBuilder,
  ExpiryInfoBuilder,
  CheckedItemBuilder,
} from './value-objects'

// エンティティビルダー
export { IngredientBuilder } from './entities/ingredient.builder'
export { CategoryBuilder, createTestCategory } from './entities/category.builder'
export { UnitBuilder, createTestUnit } from './entities/unit.builder'
export { ShoppingSessionBuilder } from './entities/shopping-session.builder'

// コマンドビルダー
export { CreateIngredientCommandBuilder } from './commands/create-ingredient-command.builder'

// DTOビルダー
export { IngredientDtoBuilder } from './dtos/ingredient.dto.builder'

// ユーザー認証系ビルダー
export { UserIdBuilder } from './value-objects/user-id.builder'
export { EmailBuilder } from './value-objects/email.builder'
export { UserProfileBuilder, UserPreferencesBuilder } from './value-objects/user-profile.builder'
export { UserStatusBuilder } from './value-objects/user-status.builder'
export { UserBuilder } from './entities/user.builder'
export { NextAuthUserBuilder } from './next-auth/next-auth-user.builder'

// 便利なヘルパー関数
import { CreateIngredientCommandBuilder as CICB } from './commands/create-ingredient-command.builder'
import { IngredientDtoBuilder as IDB } from './dtos/ingredient.dto.builder'
import { CategoryBuilder as CB } from './entities/category.builder'
import { IngredientBuilder as IB } from './entities/ingredient.builder'
import { UnitBuilder as UB } from './entities/unit.builder'
import { UserBuilder as UserB } from './entities/user.builder'
import { NextAuthUserBuilder as NAUB } from './next-auth/next-auth-user.builder'

export const anIngredient = () => new IB()
export const aCategory = () => new CB()
export const aUnit = () => new UB()
export const aCreateIngredientCommand = () => new CICB()
export const anIngredientDto = () => new IDB()
export const aNextAuthUser = () => new NAUB()
export const aUser = () => new UserB()
