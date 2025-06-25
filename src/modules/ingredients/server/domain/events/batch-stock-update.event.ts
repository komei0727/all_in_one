import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 一括在庫更新イベント
 * 複数の食材の在庫が一括更新された際に発生するドメインイベント
 */
export class BatchStockUpdate extends DomainEvent {
  constructor(
    public readonly batchId: string,
    public readonly userId: string,
    public readonly updates: Array<{
      ingredientId: string
      previousQuantity: number
      newQuantity: number
      unitId: string
    }>,
    metadata: Record<string, any> = {}
  ) {
    BatchStockUpdate.validateRequiredFields(batchId, userId, updates)
    super(batchId, metadata)
  }

  get eventName(): string {
    return 'BatchStockUpdate'
  }

  protected getPayload(): Record<string, any> {
    return {
      batchId: this.batchId,
      userId: this.userId,
      updates: this.updates,
      updateCount: this.updates.length,
    }
  }

  private static validateRequiredFields(
    batchId: string,
    userId: string,
    updates: Array<any> | null
  ): void {
    if (!batchId?.trim()) throw new Error('バッチIDは必須です')
    if (!userId?.trim()) throw new Error('ユーザーIDは必須です')
    if (!updates || updates.length === 0) throw new Error('更新データは必須です')
  }
}
