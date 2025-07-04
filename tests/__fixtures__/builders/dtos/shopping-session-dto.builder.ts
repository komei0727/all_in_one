import { faker } from '@faker-js/faker'

import { CheckedItemDto } from '@/modules/ingredients/server/application/dtos/checked-item.dto'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'

/**
 * ShoppingSessionDtoのテストデータビルダー
 */
export class ShoppingSessionDtoBuilder {
  private sessionId: string = `ses_${faker.string.alphanumeric(20)}`
  private userId: string = faker.string.uuid()
  private status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED' = 'ACTIVE'
  private startedAt: string = faker.date.recent().toISOString()
  private completedAt: string | null = null
  private deviceType: 'MOBILE' | 'WEB' = faker.helpers.arrayElement(['MOBILE', 'WEB'])
  private location: { latitude?: number; longitude?: number; name?: string } | null =
    faker.helpers.maybe(() => ({
      latitude: Number(faker.location.latitude()),
      longitude: Number(faker.location.longitude()),
      name: faker.location.streetAddress(),
    })) ?? null
  private checkedItems: CheckedItemDto[] = []

  withSessionId(sessionId: string): this {
    this.sessionId = sessionId
    return this
  }

  withUserId(userId: string): this {
    this.userId = userId
    return this
  }

  withStatus(status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED'): this {
    this.status = status
    if (status !== 'ACTIVE' && !this.completedAt) {
      this.completedAt = faker.date.recent().toISOString()
    }
    return this
  }

  withStartedAt(startedAt: string): this {
    this.startedAt = startedAt
    return this
  }

  withCompletedAt(completedAt: string | null): this {
    this.completedAt = completedAt
    return this
  }

  withDeviceType(deviceType: 'MOBILE' | 'WEB'): this {
    this.deviceType = deviceType
    return this
  }

  withLocation(location: { latitude?: number; longitude?: number; name?: string } | null): this {
    this.location = location
    return this
  }

  withCheckedItems(checkedItems: CheckedItemDto[]): this {
    this.checkedItems = checkedItems
    return this
  }

  addCheckedItem(item: CheckedItemDto): this {
    this.checkedItems.push(item)
    return this
  }

  build(): ShoppingSessionDto {
    return new ShoppingSessionDto(
      this.sessionId,
      this.userId,
      this.status,
      this.startedAt,
      this.completedAt,
      this.deviceType,
      this.location,
      this.checkedItems
    )
  }
}

/**
 * ShoppingSessionDtoビルダーのファクトリー関数
 */
export const shoppingSessionDtoBuilder = () => new ShoppingSessionDtoBuilder()

/**
 * CheckedItemDtoのテストデータビルダー
 */
export const createCheckedItem = (overrides?: Partial<CheckedItemDto>): CheckedItemDto => {
  const baseData = {
    ingredientId: faker.string.uuid(),
    ingredientName: faker.commerce.productName(),
    stockStatus: faker.helpers.arrayElement(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
    expiryStatus:
      faker.helpers.maybe(() =>
        faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED'])
      ) ?? null,
    checkedAt: faker.date.recent().toISOString(),
    ...overrides,
  }
  return new CheckedItemDto(
    baseData.ingredientId,
    baseData.ingredientName,
    baseData.stockStatus,
    baseData.expiryStatus,
    baseData.checkedAt
  )
}
