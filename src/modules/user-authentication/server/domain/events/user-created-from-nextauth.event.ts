import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * NextAuthユーザーからドメインユーザーが作成されたイベント
 * 初回ログイン時に発生する
 */
export class UserCreatedFromNextAuthEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly nextAuthId: string,
    public readonly email: string,
    public readonly displayName: string,
    public readonly isFirstTime = true
  ) {
    super(aggregateId)
  }

  get eventName(): string {
    return 'user.createdFromNextAuth'
  }

  protected getPayload(): Record<string, any> {
    return {
      nextAuthId: this.nextAuthId,
      email: this.email,
      displayName: this.displayName,
      isFirstTime: this.isFirstTime,
    }
  }
}
