import type { CheckedItemDto } from './checked-item.dto'
import type { ShoppingSession } from '../../domain/entities/shopping-session.entity'

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
      name?: string
    } | null,
    public readonly checkedItems?: CheckedItemDto[],
    public readonly totalSpent?: number
  ) {}

  /**
   * DTOをJSON形式に変換
   * @returns JSON形式の買い物セッション情報
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      deviceType: this.deviceType,
      location: this.location,
      checkedItems:
        this.checkedItems?.map((item) => ({
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          stockStatus: item.stockStatus,
          expiryStatus: item.expiryStatus,
          checkedAt: item.checkedAt,
        })) || null,
      totalSpent: this.totalSpent,
    }
  }

  /**
   * エンティティからDTOを作成
   * @param entity 買い物セッションエンティティ
   * @returns 買い物セッションDTO
   */
  static fromEntity(entity: ShoppingSession): ShoppingSessionDto {
    return new ShoppingSessionDto(
      entity.getId().getValue(),
      entity.getUserId(),
      entity.getStatus().getValue(),
      entity.getStartedAt().toISOString(),
      entity.getCompletedAt()?.toISOString() ?? null,
      entity.getDeviceType()?.getValue() ?? null,
      entity.getLocation()
        ? {
            latitude: entity.getLocation()!.getLatitude(),
            longitude: entity.getLocation()!.getLongitude(),
            name: entity.getLocation()!.getName() ?? undefined,
          }
        : null,
      undefined, // checkedItemsは必要に応じて追加
      undefined // totalSpentは必要に応じて追加
    )
  }
}
