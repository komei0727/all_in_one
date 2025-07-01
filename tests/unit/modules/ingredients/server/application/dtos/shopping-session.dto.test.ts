import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'

describe('ShoppingSessionDto', () => {
  describe('constructor', () => {
    it('すべてのプロパティを正しく設定できる', () => {
      // Arrange
      const sessionId = faker.string.alphanumeric(10)
      const userId = faker.string.uuid()
      const status = 'ACTIVE'
      const startedAt = faker.date.recent().toISOString()
      const completedAt = faker.date.recent().toISOString()
      const deviceType = 'MOBILE'
      const locationName = faker.company.name()

      // Act
      const dto = new ShoppingSessionDto(
        sessionId,
        userId,
        status,
        startedAt,
        completedAt,
        deviceType,
        { placeName: locationName }
      )

      // Assert
      expect(dto.sessionId).toBe(sessionId)
      expect(dto.userId).toBe(userId)
      expect(dto.status).toBe(status)
      expect(dto.startedAt).toBe(startedAt)
      expect(dto.completedAt).toBe(completedAt)
      expect(dto.deviceType).toBe(deviceType)
      expect(dto.location).toEqual({ placeName: locationName })
    })

    it('オプショナルなプロパティをnullで設定できる', () => {
      // Arrange
      const sessionId = faker.string.alphanumeric(10)
      const userId = faker.string.uuid()
      const status = 'ACTIVE'
      const startedAt = faker.date.recent().toISOString()

      // Act
      const dto = new ShoppingSessionDto(sessionId, userId, status, startedAt, null, null, null)

      // Assert
      expect(dto.sessionId).toBe(sessionId)
      expect(dto.userId).toBe(userId)
      expect(dto.status).toBe(status)
      expect(dto.startedAt).toBe(startedAt)
      expect(dto.completedAt).toBeNull()
      expect(dto.deviceType).toBeNull()
      expect(dto.location).toBeNull()
    })
  })

  describe('toJSON', () => {
    it('DTOをJSON形式に変換できる', () => {
      // Arrange
      const sessionId = faker.string.alphanumeric(10)
      const userId = faker.string.uuid()
      const status = 'ACTIVE'
      const startedAt = faker.date.recent().toISOString()
      const completedAt = null
      const deviceType = 'MOBILE'
      const location = { placeName: faker.company.name() }

      const dto = new ShoppingSessionDto(
        sessionId,
        userId,
        status,
        startedAt,
        completedAt,
        deviceType,
        location
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json).toEqual({
        data: {
          sessionId,
          userId,
          status,
          startedAt,
          completedAt,
          deviceType,
          location,
        },
      })
    })

    it('異なるステータスで正しくJSON変換できる', () => {
      // Arrange
      const sessionId = faker.string.alphanumeric(10)
      const userId = faker.string.uuid()
      const status = 'COMPLETED'
      const startedAt = faker.date.recent().toISOString()
      const completedAt = faker.date.recent().toISOString()

      const dto = new ShoppingSessionDto(
        sessionId,
        userId,
        status,
        startedAt,
        completedAt,
        null,
        null
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json.data.status).toBe('COMPLETED')
      expect(json.data.completedAt).toBe(completedAt)
    })
  })

  describe('バリデーション', () => {
    it('有効なステータス値を受け入れる', () => {
      // Arrange
      const validStatuses = ['ACTIVE', 'COMPLETED', 'ABANDONED']
      const sessionId = faker.string.alphanumeric(10)
      const userId = faker.string.uuid()
      const startedAt = faker.date.recent().toISOString()

      // Act & Assert
      validStatuses.forEach((status) => {
        const dto = new ShoppingSessionDto(sessionId, userId, status, startedAt, null, null, null)
        expect(dto.status).toBe(status)
      })
    })

    it('有効なデバイスタイプを受け入れる', () => {
      // Arrange
      const validDeviceTypes = ['MOBILE', 'DESKTOP', 'TABLET']
      const sessionId = faker.string.alphanumeric(10)
      const userId = faker.string.uuid()
      const startedAt = faker.date.recent().toISOString()

      // Act & Assert
      validDeviceTypes.forEach((deviceType) => {
        const dto = new ShoppingSessionDto(
          sessionId,
          userId,
          'ACTIVE',
          startedAt,
          null,
          deviceType,
          null
        )
        expect(dto.deviceType).toBe(deviceType)
      })
    })
  })
})
