import { type Ingredient } from '../entities/ingredient.entity'

/**
 * 期限チェックサービス
 * 食材の期限に関する処理を行うドメインサービス
 */
export class ExpiryCheckService {
  /**
   * 期限切れ間近の食材をチェックし、必要に応じてイベントを発行
   * @param ingredient 食材エンティティ
   * @param daysThreshold 期限切れまでの日数閾値（デフォルト: 7日）
   * @returns 期限切れ間近の場合はtrue
   */
  checkAndNotifyExpiringSoon(ingredient: Ingredient, daysThreshold = 7): boolean {
    // 期限情報がない場合は対象外
    const expiryInfo = ingredient.getExpiryInfo()
    if (!expiryInfo) {
      return false
    }

    // 既に期限切れの場合は対象外（別のイベントで処理）
    if (expiryInfo.isExpired()) {
      return false
    }

    // 期限までの日数を取得
    const daysUntilExpiry = expiryInfo.getDaysUntilExpiry()

    // 期限切れ間近かチェック
    if (daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold) {
      // 期限切れ間近イベントを発行
      // エンティティのprotectedメソッドにアクセスできないため、
      // エンティティ側にメソッドを追加する必要がある
      ingredient.notifyExpiringSoon(daysUntilExpiry)
      return true
    }

    return false
  }

  /**
   * 複数の食材の期限をチェック
   * @param ingredients 食材エンティティの配列
   * @param daysThreshold 期限切れまでの日数閾値
   * @returns 期限切れ間近の食材の配列
   */
  checkMultipleIngredients(ingredients: Ingredient[], daysThreshold = 7): Ingredient[] {
    const expiringSoonIngredients: Ingredient[] = []

    for (const ingredient of ingredients) {
      if (this.checkAndNotifyExpiringSoon(ingredient, daysThreshold)) {
        expiringSoonIngredients.push(ingredient)
      }
    }

    return expiringSoonIngredients
  }

  /**
   * 期限切れの食材を抽出
   * @param ingredients 食材エンティティの配列
   * @returns 期限切れの食材の配列
   */
  filterExpiredIngredients(ingredients: Ingredient[]): Ingredient[] {
    return ingredients.filter((ingredient) => !ingredient.isDeleted() && ingredient.isExpired())
  }

  /**
   * 期限切れ間近の食材を抽出（イベント発行なし）
   * @param ingredients 食材エンティティの配列
   * @param daysThreshold 期限切れまでの日数閾値
   * @returns 期限切れ間近の食材の配列
   */
  filterExpiringSoonIngredients(ingredients: Ingredient[], daysThreshold = 7): Ingredient[] {
    return ingredients.filter((ingredient) => {
      // 削除済みの食材は除外
      if (ingredient.isDeleted()) {
        return false
      }

      const expiryInfo = ingredient.getExpiryInfo()
      if (!expiryInfo || expiryInfo.isExpired()) {
        return false
      }

      const daysUntilExpiry = expiryInfo.getDaysUntilExpiry()
      return daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= daysThreshold
    })
  }

  /**
   * 期限によるソート（期限が近い順）
   * @param ingredients 食材エンティティの配列
   * @returns ソートされた食材の配列
   */
  sortByExpiryDate(ingredients: Ingredient[]): Ingredient[] {
    return [...ingredients].sort((a, b) => {
      const aExpiry = a.getExpiryInfo()
      const bExpiry = b.getExpiryInfo()

      // 期限情報がない場合は最後に
      if (!aExpiry && !bExpiry) return 0
      if (!aExpiry) return 1
      if (!bExpiry) return -1

      // 期限日で比較
      const aDate = aExpiry.getDisplayDate()
      const bDate = bExpiry.getDisplayDate()

      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1

      return aDate.getTime() - bDate.getTime()
    })
  }
}
