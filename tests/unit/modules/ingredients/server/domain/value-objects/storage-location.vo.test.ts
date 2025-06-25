import { describe, expect, it } from 'vitest'

import { StorageLocation, StorageType } from '@/modules/ingredients/server/domain/value-objects'

import { StorageLocationBuilder } from '../../../../../../__fixtures__/builders'

describe('StorageLocation', () => {
  describe('constructor', () => {
    it('保管場所タイプのみで作成できる', () => {
      // Arrange & Act
      const location = new StorageLocationBuilder().build()

      // Assert
      expect(location.getType()).toBe(StorageType.REFRIGERATED)
      expect(location.getDetail()).toBeNull()
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

    it('空白のみの詳細はnullとして扱われる', () => {
      // Arrange
      const builder = new StorageLocationBuilder()
        .withType(StorageType.REFRIGERATED)
        .withDetail('   ')

      // Act
      const location = builder.build()

      // Assert
      expect(location.getDetail()).toBeNull()
    })

    it('無効な保管場所タイプの場合エラーをスローする', () => {
      // Arrange
      const invalidType = 'INVALID_TYPE' as any

      // Act & Assert
      expect(() => new StorageLocationBuilder().withType(invalidType).build()).toThrow(
        '無効な保存場所タイプです'
      )
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

  describe('タイプ判定メソッド', () => {
    it('isRefrigerated()が正しく動作する', () => {
      // Arrange
      const refrigerated = new StorageLocationBuilder().withType(StorageType.REFRIGERATED).build()
      const frozen = new StorageLocationBuilder().withType(StorageType.FROZEN).build()
      const room = new StorageLocationBuilder().withRoomTemperature().build()

      // Act & Assert
      expect(refrigerated.isRefrigerated()).toBe(true)
      expect(frozen.isRefrigerated()).toBe(false)
      expect(room.isRefrigerated()).toBe(false)
    })

    it('isFrozen()が正しく動作する', () => {
      // Arrange
      const refrigerated = new StorageLocationBuilder().withType(StorageType.REFRIGERATED).build()
      const frozen = new StorageLocationBuilder().withType(StorageType.FROZEN).build()
      const room = new StorageLocationBuilder().withRoomTemperature().build()

      // Act & Assert
      expect(refrigerated.isFrozen()).toBe(false)
      expect(frozen.isFrozen()).toBe(true)
      expect(room.isFrozen()).toBe(false)
    })

    it('isRoomTemperature()が正しく動作する', () => {
      // Arrange
      const refrigerated = new StorageLocationBuilder().withType(StorageType.REFRIGERATED).build()
      const frozen = new StorageLocationBuilder().withType(StorageType.FROZEN).build()
      const room = new StorageLocationBuilder().withRoomTemperature().build()

      // Act & Assert
      expect(refrigerated.isRoomTemperature()).toBe(false)
      expect(frozen.isRoomTemperature()).toBe(false)
      expect(room.isRoomTemperature()).toBe(true)
    })
  })

  describe('toObject/fromObject', () => {
    it('toObject()でプレーンオブジェクトに変換できる', () => {
      // Arrange
      const location = new StorageLocationBuilder()
        .withType(StorageType.REFRIGERATED)
        .withDetail('野菜室')
        .build()

      // Act
      const obj = location.toObject()

      // Assert
      expect(obj).toEqual({
        type: 'REFRIGERATED',
        detail: '野菜室',
      })
    })

    it('detailがnullの場合もtoObject()で正しく変換される', () => {
      // Arrange
      const location = new StorageLocationBuilder().withType(StorageType.FROZEN).build()

      // Act
      const obj = location.toObject()

      // Assert
      expect(obj).toEqual({
        type: 'FROZEN',
        detail: null,
      })
    })

    it('fromObject()でプレーンオブジェクトから復元できる', () => {
      // Arrange
      const obj = {
        type: StorageType.REFRIGERATED,
        detail: 'ドアポケット',
      }

      // Act
      const location = StorageLocation.fromObject(obj)

      // Assert
      expect(location.getType()).toBe(StorageType.REFRIGERATED)
      expect(location.getDetail()).toBe('ドアポケット')
    })

    it('fromObject()でdetailがない場合も復元できる', () => {
      // Arrange
      const obj = {
        type: StorageType.FROZEN,
      }

      // Act
      const location = StorageLocation.fromObject(obj)

      // Assert
      expect(location.getType()).toBe(StorageType.FROZEN)
      expect(location.getDetail()).toBeNull()
    })
  })
})
