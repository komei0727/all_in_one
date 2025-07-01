import { faker } from '@faker-js/faker'

import { ShoppingSession } from '@/modules/ingredients/server/domain/entities/shopping-session.entity'
import { DeviceType } from '@/modules/ingredients/server/domain/value-objects/device-type.vo'
import { SessionStatus } from '@/modules/ingredients/server/domain/value-objects/session-status.vo'
import { ShoppingLocation } from '@/modules/ingredients/server/domain/value-objects/shopping-location.vo'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects/shopping-session-id.vo'

export class ShoppingSessionBuilder {
  private sessionId: string
  private userId: string
  private status: 'ACTIVE' | 'COMPLETED'
  private startedAt: Date
  private completedAt?: Date
  private deviceType?: 'MOBILE' | 'TABLET' | 'DESKTOP'
  private location?: { latitude: number; longitude: number }

  constructor() {
    // デフォルト値をFakerで生成
    this.sessionId = ShoppingSessionId.create().getValue() // 正しいフォーマットで生成
    this.userId = faker.string.uuid()
    this.status = 'ACTIVE'
    this.startedAt = faker.date.recent()
  }

  withSessionId(sessionId: string): ShoppingSessionBuilder {
    this.sessionId = sessionId
    return this
  }

  withUserId(userId: string): ShoppingSessionBuilder {
    this.userId = userId
    return this
  }

  withActiveStatus(): ShoppingSessionBuilder {
    this.status = 'ACTIVE'
    this.completedAt = undefined
    return this
  }

  withCompletedStatus(): ShoppingSessionBuilder {
    this.status = 'COMPLETED'
    this.completedAt = faker.date.between({ from: this.startedAt, to: new Date() })
    return this
  }

  withStartedAt(startedAt: Date): ShoppingSessionBuilder {
    this.startedAt = startedAt
    return this
  }

  withCompletedAt(completedAt: Date): ShoppingSessionBuilder {
    this.completedAt = completedAt
    return this
  }

  withDeviceType(deviceType: 'MOBILE' | 'TABLET' | 'DESKTOP'): ShoppingSessionBuilder {
    this.deviceType = deviceType
    return this
  }

  withLocation(latitude: number, longitude: number): ShoppingSessionBuilder {
    this.location = { latitude, longitude }
    return this
  }

  build(): ShoppingSession {
    return new ShoppingSession({
      id: new ShoppingSessionId(this.sessionId),
      userId: this.userId,
      status: this.status === 'ACTIVE' ? SessionStatus.ACTIVE : SessionStatus.COMPLETED,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      checkedItems: [],
      deviceType: this.deviceType ? DeviceType.fromString(this.deviceType) : null,
      location: this.location
        ? ShoppingLocation.create({
            latitude: this.location.latitude,
            longitude: this.location.longitude,
          })
        : null,
      isNew: false,
    })
  }
}

export const shoppingSessionBuilder = () => new ShoppingSessionBuilder()
