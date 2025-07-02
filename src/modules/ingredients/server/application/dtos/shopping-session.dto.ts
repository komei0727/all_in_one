import type { CheckedItemDto } from './checked-item.dto'

/**
 * 買い物セッションDTOクラス
 * APIレスポンスとして返す買い物セッション情報を保持する
 */
export class ShoppingSessionDto {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly status: string,
    public readonly startedAt: string,
    public readonly completedAt: string | null,
    public readonly deviceType: string | null,
    public readonly location: {
      latitude?: number
      longitude?: number
      placeName?: string
    } | null,
    public readonly checkedItems?: CheckedItemDto[]
  ) {}

  /**
   * DTOをJSON形式に変換
   * @returns JSON形式の買い物セッション情報
   */
  toJSON() {
    return {
      data: {
        sessionId: this.sessionId,
        userId: this.userId,
        status: this.status,
        startedAt: this.startedAt,
        completedAt: this.completedAt,
        deviceType: this.deviceType,
        location: this.location,
        checkedItems: this.checkedItems?.map((item) => item.toJSON().data) || null,
      },
    }
  }
}
