import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * 既存ドメインユーザーとNextAuthユーザーが同期されたイベント
 * ログイン時の同期処理で発生する
 */
export class UserSyncedWithNextAuthEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly nextAuthId: string,
    public readonly syncedFields: ('email' | 'name' | 'lastLoginAt')[],
    public readonly changes: Array<{
      field: string
      oldValue: any
      newValue: any
    }>
  ) {
    super(aggregateId)
  }

  get eventName(): string {
    return 'user.syncedWithNextAuth'
  }

  protected getPayload(): Record<string, any> {
    return {
      nextAuthId: this.nextAuthId,
      syncedFields: this.syncedFields,
      changes: this.changes,
    }
  }
}
