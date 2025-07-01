import type { DeviceType, ShoppingLocation } from '../../domain/value-objects'

/**
 * 買い物セッション開始コマンド
 */
export class StartShoppingSessionCommand {
  constructor(
    public readonly userId: string,
    public readonly deviceType?: DeviceType,
    public readonly location?: ShoppingLocation
  ) {}
}
