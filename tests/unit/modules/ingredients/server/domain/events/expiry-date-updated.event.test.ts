import { describe, it, expect } from 'vitest'
import { ExpiryDateUpdated } from '@/modules/ingredients/server/domain/events/expiry-date-updated.event'

describe('ExpiryDateUpdated イベント', () => {
  describe('イベント作成テスト', () => {
    it('必須データで賞味期限更新イベントを作成できる', () => {
      // 賞味期限更新時に発生するイベントのテスト
      const eventData = {
        ingredientId: 'ingredient-123',
        userId: 'user-456',
        previousExpiryDate: new Date('2024-01-15'),
        newExpiryDate: new Date('2024-01-20'),
        reason: 'package-recheck',
      }
      const metadata = {
        userId: 'user-456',
        correlationId: 'expiry-update-789',
      }

      // Act
      const event = new ExpiryDateUpdated(
        eventData.ingredientId,
        eventData.userId,
        eventData.previousExpiryDate,
        eventData.newExpiryDate,
        eventData.reason,
        metadata
      )

      // Assert
      expect(event.eventName).toBe('ExpiryDateUpdated')
      expect(event.aggregateId).toBe(eventData.ingredientId)
      expect(event.ingredientId).toBe(eventData.ingredientId)
      expect(event.userId).toBe(eventData.userId)
      expect(event.previousExpiryDate).toEqual(eventData.previousExpiryDate)
      expect(event.newExpiryDate).toEqual(eventData.newExpiryDate)
      expect(event.reason).toBe(eventData.reason)
      expect(event.metadata).toEqual(metadata)
    })

    it('理由なしで作成できる', () => {
      // 更新理由が省略されても作成できることを確認
      const previousDate = new Date('2024-01-15')
      const newDate = new Date('2024-01-20')
      const event = new ExpiryDateUpdated('ingredient-123', 'user-456', previousDate, newDate)

      // Assert
      expect(event.reason).toBeUndefined()
    })
  })

  describe('イベントデータ検証テスト', () => {
    it('食材IDが空の場合はエラーになる', () => {
      const previousDate = new Date('2024-01-15')
      const newDate = new Date('2024-01-20')
      expect(() => {
        new ExpiryDateUpdated('', 'user-456', previousDate, newDate)
      }).toThrow('食材IDは必須です')
    })

    it('新しい期限が古い期限より前の場合は警告', () => {
      // ビジネスルール：通常は期限を延長するが、短縮も可能
      const previousDate = new Date('2024-01-20')
      const newDate = new Date('2024-01-15') // より早い期限

      // エラーにはならないが、理由が推奨される
      const event = new ExpiryDateUpdated(
        'ingredient-123',
        'user-456',
        previousDate,
        newDate,
        'package-damage'
      )

      expect(event.newExpiryDate).toEqual(newDate)
    })
  })
})
