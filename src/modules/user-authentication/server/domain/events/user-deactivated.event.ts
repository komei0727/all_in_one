import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * ユーザーが無効化されたイベント
 * アカウントの論理削除時に発生する
 */
export class UserDeactivatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly reason: 'USER_REQUEST' | 'ADMIN_ACTION' | 'POLICY_VIOLATION' | 'DATA_RETENTION',
    public readonly deactivatedBy: string,
    public readonly effectiveDate: Date = new Date()
  ) {
    super(aggregateId)
  }

  get eventName(): string {
    return 'user.deactivated'
  }

  protected getPayload(): Record<string, any> {
    return {
      reason: this.reason,
      deactivatedBy: this.deactivatedBy,
      effectiveDate: this.effectiveDate.toISOString(),
    }
  }
}
