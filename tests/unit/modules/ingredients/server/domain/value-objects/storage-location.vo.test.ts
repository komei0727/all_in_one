import { describe, expect, it } from 'vitest'

import { StorageType } from '@/modules/ingredients/server/domain/value-objects'

import { StorageLocationBuilder } from '../../../../../../__fixtures__/builders'

describe('StorageLocation', () => {
  describe('constructor', () => {
    it('保管場所タイプのみで作成できる', () => {
      // Arrange & Act
      const location = new StorageLocationBuilder().build()

      // Assert
      expect(location.getType()).toBe(StorageType.REFRIGERATED)
      expect(location.getDetail()).toBe('')
    })

    it('保管場所タイプと詳細で作成できる', () => {
      // Arrange & Act
      const location = new StorageLocationBuilder().withVegetableCompartment().build()

      // Assert
      expect(location.getType()).toBe(StorageType.REFRIGERATED)
      expect(location.getDetail()).toBe('野菜室')
    })

    it('詳細の前後の空白は自動的にトリムされる', () => {
      // Arrange
      const builder = new StorageLocationBuilder()
        .withType(StorageType.FROZEN)
        .withDetailWithSpaces()
      const originalDetail = builder['props'].detail!
      const expectedDetail = originalDetail.trim()

      // Act
      const location = builder.build()

      // Assert
      expect(location.getDetail()).toBe(expectedDetail)
      expect(location.getDetail()).not.toMatch(/^\s|\s$/) // 前後に空白がないことを確認
    })

    it('詳細が50文字を超える場合エラーをスローする', () => {
      // Arrange
      const builder = new StorageLocationBuilder().withRoomTemperature().withTooLongDetail()

      // Act & Assert
      expect(() => builder.build()).toThrow('保管場所の詳細は50文字以内で入力してください')
    })

    it('すべての保管場所タイプで作成できる', () => {
      // Act & Assert
      expect(() =>
        new StorageLocationBuilder().withType(StorageType.REFRIGERATED).build()
      ).not.toThrow()
      expect(() => new StorageLocationBuilder().withType(StorageType.FROZEN).build()).not.toThrow()
      expect(() => new StorageLocationBuilder().withRoomTemperature().build()).not.toThrow()
    })
  })

  describe('equals', () => {
    it('同じタイプと詳細の場合trueを返す', () => {
      // Arrange
      const location1 = new StorageLocationBuilder().withVegetableCompartment().build()
      const location2 = new StorageLocationBuilder().withVegetableCompartment().build()

      // Act & Assert
      expect(location1.equals(location2)).toBe(true)
    })

    it('タイプが異なる場合falseを返す', () => {
      // Arrange
      const location1 = new StorageLocationBuilder().withVegetableCompartment().build()
      const location2 = new StorageLocationBuilder().withFreezer().build()

      // Act & Assert
      expect(location1.equals(location2)).toBe(false)
    })

    it('詳細が異なる場合falseを返す', () => {
      // Arrange
      const location1 = new StorageLocationBuilder().withVegetableCompartment().build()
      const location2 = new StorageLocationBuilder()
        .withType(StorageType.REFRIGERATED)
        .withDetail('チルド室')
        .build()

      // Act & Assert
      expect(location1.equals(location2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('タイプのみの場合、タイプの表示名を返す', () => {
      // Arrange
      const location = new StorageLocationBuilder().build()

      // Act & Assert
      expect(location.toString()).toBe('冷蔵')
    })

    it('詳細がある場合、タイプと詳細を組み合わせて返す', () => {
      // Arrange
      const location = new StorageLocationBuilder().withVegetableCompartment().build()

      // Act & Assert
      expect(location.toString()).toBe('冷蔵（野菜室）')
    })

    it('すべてのタイプで正しい表示名を返す', () => {
      // Act & Assert
      expect(
        new StorageLocationBuilder().withType(StorageType.REFRIGERATED).build().toString()
      ).toBe('冷蔵')
      expect(new StorageLocationBuilder().withType(StorageType.FROZEN).build().toString()).toBe(
        '冷凍'
      )
      expect(new StorageLocationBuilder().withRoomTemperature().build().toString()).toBe('常温')
    })
  })
})
