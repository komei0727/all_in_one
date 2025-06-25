import { faker } from '@faker-js/faker/locale/ja'

import { NextAuthIntegrationFailedEvent } from '@/modules/user-authentication/server/domain/events/nextauth-integration-failed.event'
import { UserCreatedFromNextAuthEvent } from '@/modules/user-authentication/server/domain/events/user-created-from-nextauth.event'
import { UserDeactivatedEvent } from '@/modules/user-authentication/server/domain/events/user-deactivated.event'
import { UserProfileUpdatedEvent } from '@/modules/user-authentication/server/domain/events/user-profile-updated.event'
import { UserSyncedWithNextAuthEvent } from '@/modules/user-authentication/server/domain/events/user-synced-with-nextauth.event'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'

/**
 * ユーザー作成イベントのテストデータビルダー
 */
export class UserCreatedFromNextAuthEventBuilder {
  private aggregateId: string = faker.string.uuid()
  private nextAuthId: string = faker.string.uuid()
  private email: string = faker.internet.email()
  private displayName: string = faker.person.fullName()
  private isFirstTime: boolean = true

  withAggregateId(id: string): this {
    this.aggregateId = id
    return this
  }

  withNextAuthId(id: string): this {
    this.nextAuthId = id
    return this
  }

  withEmail(email: string): this {
    this.email = email
    return this
  }

  withDisplayName(name: string): this {
    this.displayName = name
    return this
  }

  withIsFirstTime(isFirstTime: boolean): this {
    this.isFirstTime = isFirstTime
    return this
  }

  build(): UserCreatedFromNextAuthEvent {
    return new UserCreatedFromNextAuthEvent(
      this.aggregateId,
      this.nextAuthId,
      this.email,
      this.displayName,
      this.isFirstTime
    )
  }
}

/**
 * プロフィール更新イベントのテストデータビルダー
 */
export class UserProfileUpdatedEventBuilder {
  private aggregateId: string = faker.string.uuid()
  private oldProfile: UserProfile = this.createRandomProfile()
  private newProfile: UserProfile = this.createRandomProfile()
  private updatedFields: string[] = ['displayName']

  private createRandomProfile(): UserProfile {
    return new UserProfile({
      displayName: faker.person.fullName(),
      timezone: faker.helpers.arrayElement(['Asia/Tokyo', 'America/New_York', 'Europe/London']),
      language: faker.helpers.arrayElement(['ja', 'en'] as const),
      preferences: new UserPreferences({
        theme: faker.helpers.arrayElement(['light', 'dark', 'auto'] as const),
        notifications: faker.datatype.boolean(),
        emailFrequency: faker.helpers.arrayElement([
          'daily',
          'weekly',
          'monthly',
          'never',
        ] as const),
      }),
    })
  }

  withAggregateId(id: string): this {
    this.aggregateId = id
    return this
  }

  withOldProfile(profile: UserProfile): this {
    this.oldProfile = profile
    return this
  }

  withNewProfile(profile: UserProfile): this {
    this.newProfile = profile
    return this
  }

  withUpdatedFields(fields: string[]): this {
    this.updatedFields = fields
    return this
  }

  build(): UserProfileUpdatedEvent {
    return new UserProfileUpdatedEvent(
      this.aggregateId,
      this.oldProfile,
      this.newProfile,
      this.updatedFields
    )
  }
}

/**
 * ユーザー無効化イベントのテストデータビルダー
 */
export class UserDeactivatedEventBuilder {
  private aggregateId: string = faker.string.uuid()
  private reason: 'USER_REQUEST' | 'ADMIN_ACTION' | 'POLICY_VIOLATION' | 'DATA_RETENTION' =
    faker.helpers.arrayElement([
      'USER_REQUEST',
      'ADMIN_ACTION',
      'POLICY_VIOLATION',
      'DATA_RETENTION',
    ] as const)
  private deactivatedBy: string = faker.string.uuid()
  private effectiveDate: Date = faker.date.recent()

  withAggregateId(id: string): this {
    this.aggregateId = id
    return this
  }

  withReason(
    reason: 'USER_REQUEST' | 'ADMIN_ACTION' | 'POLICY_VIOLATION' | 'DATA_RETENTION'
  ): this {
    this.reason = reason
    return this
  }

  withDeactivatedBy(id: string): this {
    this.deactivatedBy = id
    return this
  }

  withEffectiveDate(date: Date): this {
    this.effectiveDate = date
    return this
  }

  build(): UserDeactivatedEvent {
    return new UserDeactivatedEvent(
      this.aggregateId,
      this.reason,
      this.deactivatedBy,
      this.effectiveDate
    )
  }
}

/**
 * NextAuth統合失敗イベントのテストデータビルダー
 */
export class NextAuthIntegrationFailedEventBuilder {
  private nextAuthId: string = faker.string.uuid()
  private email: string | undefined = faker.internet.email()
  private errorType: 'USER_CREATION_FAILED' | 'SYNC_FAILED' | 'VALIDATION_FAILED' =
    faker.helpers.arrayElement([
      'USER_CREATION_FAILED',
      'SYNC_FAILED',
      'VALIDATION_FAILED',
    ] as const)
  private errorMessage: string = faker.lorem.sentence()
  private errorDetails: Record<string, any> = {
    code: faker.string.alphanumeric(10),
    timestamp: faker.date.recent().toISOString(),
  }

  withNextAuthId(id: string): this {
    this.nextAuthId = id
    return this
  }

  withEmail(email: string | undefined): this {
    this.email = email
    return this
  }

  withErrorType(type: 'USER_CREATION_FAILED' | 'SYNC_FAILED' | 'VALIDATION_FAILED'): this {
    this.errorType = type
    return this
  }

  withErrorMessage(message: string): this {
    this.errorMessage = message
    return this
  }

  withErrorDetails(details: Record<string, any>): this {
    this.errorDetails = details
    return this
  }

  build(): NextAuthIntegrationFailedEvent {
    return new NextAuthIntegrationFailedEvent(
      this.nextAuthId,
      this.email,
      this.errorType,
      this.errorMessage,
      this.errorDetails
    )
  }
}

/**
 * ユーザー同期イベントのテストデータビルダー
 */
export class UserSyncedWithNextAuthEventBuilder {
  private aggregateId: string = faker.string.uuid()
  private nextAuthId: string = faker.string.uuid()
  private syncedFields: ('email' | 'name' | 'lastLoginAt')[] = ['email']
  private changes: Array<{ field: string; oldValue: any; newValue: any }> = [
    {
      field: 'email',
      oldValue: faker.internet.email(),
      newValue: faker.internet.email(),
    },
  ]

  withAggregateId(id: string): this {
    this.aggregateId = id
    return this
  }

  withNextAuthId(id: string): this {
    this.nextAuthId = id
    return this
  }

  withSyncedFields(fields: ('email' | 'name' | 'lastLoginAt')[]): this {
    this.syncedFields = fields
    return this
  }

  withChanges(changes: Array<{ field: string; oldValue: any; newValue: any }>): this {
    this.changes = changes
    return this
  }

  build(): UserSyncedWithNextAuthEvent {
    return new UserSyncedWithNextAuthEvent(
      this.aggregateId,
      this.nextAuthId,
      this.syncedFields,
      this.changes
    )
  }
}

/**
 * ヘルパー関数
 */
export function createUserCreatedEvent(): UserCreatedFromNextAuthEventBuilder {
  return new UserCreatedFromNextAuthEventBuilder()
}

export function createProfileUpdatedEvent(): UserProfileUpdatedEventBuilder {
  return new UserProfileUpdatedEventBuilder()
}

export function createUserDeactivatedEvent(): UserDeactivatedEventBuilder {
  return new UserDeactivatedEventBuilder()
}

export function createIntegrationFailedEvent(): NextAuthIntegrationFailedEventBuilder {
  return new NextAuthIntegrationFailedEventBuilder()
}

export function createUserSyncedEvent(): UserSyncedWithNextAuthEventBuilder {
  return new UserSyncedWithNextAuthEventBuilder()
}
