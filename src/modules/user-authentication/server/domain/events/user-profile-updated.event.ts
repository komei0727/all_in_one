import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

import { UserProfile } from '../value-objects/user-profile.vo'

/**
 * ユーザープロフィールが更新されたイベント
 * プロフィール情報の変更時に発生する
 */
export class UserProfileUpdatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly oldProfile: UserProfile,
    public readonly newProfile: UserProfile,
    public readonly updatedFields: string[]
  ) {
    super(aggregateId)
  }

  get eventName(): string {
    return 'user.profileUpdated'
  }

  protected getPayload(): Record<string, any> {
    return {
      oldProfile: {
        displayName: this.oldProfile.getDisplayName(),
        timezone: this.oldProfile.getTimezone(),
        language: this.oldProfile.getLanguage(),
        preferences: {
          theme: this.oldProfile.getPreferences().getTheme(),
          notifications: this.oldProfile.getPreferences().getNotifications(),
          emailFrequency: this.oldProfile.getPreferences().getEmailFrequency(),
        },
      },
      newProfile: {
        displayName: this.newProfile.getDisplayName(),
        timezone: this.newProfile.getTimezone(),
        language: this.newProfile.getLanguage(),
        preferences: {
          theme: this.newProfile.getPreferences().getTheme(),
          notifications: this.newProfile.getPreferences().getNotifications(),
          emailFrequency: this.newProfile.getPreferences().getEmailFrequency(),
        },
      },
      updatedFields: this.updatedFields,
    }
  }
}
