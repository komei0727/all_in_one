import { ShoppingSessionDto } from './shopping-session.dto'

import type { CheckedItemDto } from './checked-item.dto'

/**
 * 完了した買い物セッション用DTOクラス
 * 買い物セッション完了APIのレスポンス専用
 */
export class CompleteShoppingSessionDto extends ShoppingSessionDto {
  constructor(
    sessionId: string,
    userId: string,
    status: string,
    startedAt: string,
    completedAt: string | null,
    deviceType: string | null,
    location: {
      latitude?: number
      longitude?: number
      name?: string
    } | null,
    checkedItems: CheckedItemDto[] | undefined,
    public readonly duration: number, // セッション継続時間（秒単位）
    public readonly checkedItemsCount: number // 確認済み食材の数
  ) {
    super(sessionId, userId, status, startedAt, completedAt, deviceType, location, checkedItems)
  }

  /**
   * DTOをJSON形式に変換（完了セッション用の拡張版）
   * @returns JSON形式の買い物セッション情報（durationとcheckedItemsCountを含む）
   */
  toJSON() {
    // 親クラスのtoJSONを呼び出してから、追加フィールドをマージ
    const baseJson = super.toJSON()

    return {
      ...baseJson,
      duration: this.duration,
      checkedItemsCount: this.checkedItemsCount,
    }
  }
}
