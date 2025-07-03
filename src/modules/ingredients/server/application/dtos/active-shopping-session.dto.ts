import { ShoppingSessionDto } from './shopping-session.dto'

import type { CheckedItemDto } from './checked-item.dto'

/**
 * アクティブな買い物セッション用DTOクラス
 * API設計書で定義された追加フィールドを含む
 */
export class ActiveShoppingSessionDto extends ShoppingSessionDto {
  constructor(
    sessionId: string,
    userId: string,
    status: string,
    startedAt: string,
    deviceType: string | null,
    location: {
      latitude?: number
      longitude?: number
      name?: string
    } | null,
    checkedItems: CheckedItemDto[] | undefined,
    public readonly duration: number,
    public readonly checkedItemsCount: number,
    public readonly lastActivityAt: string
  ) {
    // アクティブなセッションはcompletedAtが常にnullなので、親クラスにはnullを渡す
    super(sessionId, userId, status, startedAt, null, deviceType, location, checkedItems)
  }

  /**
   * DTOをJSON形式に変換（アクティブセッション用の拡張版）
   * @returns JSON形式の買い物セッション情報（拡張フィールドを含む）
   */
  toActiveSessionJSON() {
    // 親クラスのtoJSONを呼び出してから、追加フィールドをマージ
    const baseJson = super.toJSON()

    // completedAtを除外し、追加フィールドを含めて返す

    const { completedAt: _completedAt, ...baseWithoutCompletedAt } = baseJson

    return {
      ...baseWithoutCompletedAt,
      duration: this.duration,
      checkedItemsCount: this.checkedItemsCount,
      lastActivityAt: this.lastActivityAt,
    }
  }
}
