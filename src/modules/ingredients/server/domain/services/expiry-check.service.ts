import { Ingredient } from '../entities/ingredient.entity'

/**
 * 期限チェックサービス
 * 食材の期限に関する判定とソートを行う
 */
export class ExpiryCheckService {
  /**
   * 期限切れの食材を取得
   * @param ingredients 食材リスト
   * @returns 期限切れの食材リスト
   */
  getExpiredIngredients(ingredients: Ingredient[]): Ingredient[] {
    return ingredients.filter((ingredient) => !ingredient.isDeleted() && ingredient.isExpired())
  }

  /**
   * 期限切れ間近の食材を取得
   * @param ingredients 食材リスト
   * @param days 判定する日数（デフォルト7日）
   * @returns 指定日数以内に期限切れになる食材リスト
   */
  getExpiringSoonIngredients(ingredients: Ingredient[], days: number = 7): Ingredient[] {
    return ingredients.filter((ingredient) => {
      if (ingredient.isDeleted()) {
        return false
      }

      const expiryInfo = ingredient.getExpiryInfo()
      if (!expiryInfo) {
        return false
      }

      return expiryInfo.isExpiringSoon(days)
    })
  }

  /**
   * 期限順にソート（期限の近い順）
   * @param ingredients 食材リスト
   * @returns ソートされた食材リスト（新しい配列）
   */
  sortByExpiry(ingredients: Ingredient[]): Ingredient[] {
    // 新しい配列を作成してソート（元の配列を変更しない）
    return [...ingredients].sort((a, b) => {
      const expiryA = a.getExpiryInfo()
      const expiryB = b.getExpiryInfo()

      // 期限情報がない場合は最後に配置
      if (!expiryA && !expiryB) {
        return 0
      }
      if (!expiryA) {
        return 1
      }
      if (!expiryB) {
        return -1
      }

      // 有効な期限日付を取得（賞味期限を優先）
      const dateA = expiryA.getEffectiveExpiryDate()
      const dateB = expiryB.getEffectiveExpiryDate()

      // 両方nullの場合
      if (!dateA && !dateB) {
        return 0
      }
      if (!dateA) {
        return 1
      }
      if (!dateB) {
        return -1
      }

      // 日付でソート（昇順：期限の近い順）
      return dateA.getTime() - dateB.getTime()
    })
  }
}
