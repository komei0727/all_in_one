import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 単位更新イベント
 * 単位情報が更新された際に発生するドメインイベント
 */
export class UnitUpdated extends DomainEvent {
  constructor(
    public readonly unitId: string,
    public readonly userId: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    metadata: Record<string, any> = {}
  ) {
    UnitUpdated.validateRequiredFields(unitId, userId, changes)
    super(unitId, metadata)
  }

  get eventName(): string {
    return 'UnitUpdated'
  }

  protected getPayload(): Record<string, any> {
    return {
      unitId: this.unitId,
      userId: this.userId,
      changes: this.changes,
    }
  }

  private static validateRequiredFields(
    unitId: string,
    userId: string,
    changes: Record<string, { from: any; to: any }> | null
  ): void {
    if (!unitId?.trim()) throw new Error('単位IDは必須です')
    if (!userId?.trim()) throw new Error('ユーザーIDは必須です')
    if (!changes || Object.keys(changes).length === 0) throw new Error('変更内容は必須です')
  }
}
