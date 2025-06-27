import type { Ingredient } from '../entities/ingredient.entity'

/**
 * 食材重複判定サービス
 * 同一ユーザー内での食材の重複を判定する
 */
export class DuplicateCheckService {
  /**
   * 食材が重複しているかチェック
   * @param ingredient チェック対象の食材
   * @param existingIngredients 既存の食材リスト
   * @returns 重複している場合はtrue
   */
  isDuplicate(ingredient: Ingredient, existingIngredients: Ingredient[]): boolean {
    return existingIngredients.some((existing) => this.isSameIngredient(ingredient, existing))
  }

  /**
   * 重複する食材を検索
   * @param ingredient チェック対象の食材
   * @param existingIngredients 既存の食材リスト
   * @returns 重複する食材のリスト
   */
  findDuplicates(ingredient: Ingredient, existingIngredients: Ingredient[]): Ingredient[] {
    return existingIngredients.filter((existing) => this.isSameIngredient(ingredient, existing))
  }

  /**
   * 2つの食材が同じかどうかを判定
   * 判定基準：ユーザーID + 食材名 + 期限情報 + 保存場所
   * @param ingredient1 食材1
   * @param ingredient2 食材2
   * @returns 同じ食材の場合はtrue
   */
  private isSameIngredient(ingredient1: Ingredient, ingredient2: Ingredient): boolean {
    // 削除済みの食材は除外
    if (ingredient1.isDeleted() || ingredient2.isDeleted()) {
      return false
    }

    // ユーザーIDが異なる場合は別の食材
    if (ingredient1.getUserId() !== ingredient2.getUserId()) {
      return false
    }

    // 食材名が異なる場合は別の食材
    if (!ingredient1.getName().equals(ingredient2.getName())) {
      return false
    }

    // 期限情報の比較
    const expiry1 = ingredient1.getExpiryInfo()
    const expiry2 = ingredient2.getExpiryInfo()

    // 両方nullまたは両方が等しい場合のみ同じ
    const isExpiryEqual =
      (expiry1 === null && expiry2 === null) ||
      (expiry1 !== null && expiry2 !== null && expiry1.equals(expiry2))

    if (!isExpiryEqual) {
      return false
    }

    // 保存場所の比較
    const storage1 = ingredient1.getIngredientStock().getStorageLocation()
    const storage2 = ingredient2.getIngredientStock().getStorageLocation()

    return storage1.equals(storage2)
  }
}
