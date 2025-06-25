import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * NextAuth統合処理が失敗したイベント
 * NextAuthとの連携エラー時に発生する
 */
export class NextAuthIntegrationFailedEvent extends DomainEvent {
  constructor(
    public readonly nextAuthId: string,
    public readonly email: string | undefined,
    public readonly errorType: 'USER_CREATION_FAILED' | 'SYNC_FAILED' | 'VALIDATION_FAILED',
    public readonly errorMessage: string,
    public readonly errorDetails: Record<string, any> = {}
  ) {
    // 統合失敗イベントは集約IDがない場合があるため、NextAuthIDを使用
    super(nextAuthId)
  }

  get eventName(): string {
    return 'user.nextAuthIntegrationFailed'
  }

  protected getPayload(): Record<string, any> {
    return {
      nextAuthId: this.nextAuthId,
      email: this.email,
      errorType: this.errorType,
      errorMessage: this.errorMessage,
      errorDetails: this.errorDetails,
    }
  }
}
