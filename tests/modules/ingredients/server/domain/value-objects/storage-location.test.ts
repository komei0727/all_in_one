import { describe, expect, it } from 'vitest'

import { StorageLocation, StorageType } from '@/modules/ingredients/server/domain/value-objects'

describe('StorageLocation', () => {
  describe('constructor', () => {
    it('保管場所タイプのみで作成できる', () => {
      // Arrange
      const type = StorageType.REFRIGERATED

      // Act
      const location = new StorageLocation(type)

      // Assert
      expect(location.getType()).toBe(StorageType.REFRIGERATED)
      expect(location.getDetail()).toBe('')
    })

    it('保管場所タイプと詳細で作成できる', () => {
      // Arrange
      const type = StorageType.REFRIGERATED
      const detail = '野菜室'

      // Act
      const location = new StorageLocation(type, detail)

      // Assert
      expect(location.getType()).toBe(StorageType.REFRIGERATED)
      expect(location.getDetail()).toBe('野菜室')
    })

    it('詳細の前後の空白は自動的にトリムされる', () => {
      // Arrange
      const type = StorageType.FROZEN
      const detailWithSpaces = '  冷凍庫上段  '

      // Act
      const location = new StorageLocation(type, detailWithSpaces)

      // Assert
      expect(location.getDetail()).toBe('冷凍庫上段')
    })

    it('詳細が50文字を超える場合エラーをスローする', () => {
      // Arrange
      const type = StorageType.ROOM_TEMPERATURE
      const tooLongDetail = 'あ'.repeat(51)

      // Act & Assert
      expect(() => new StorageLocation(type, tooLongDetail)).toThrow(
        '保管場所の詳細は50文字以内で入力してください'
      )
    })

    it('すべての保管場所タイプで作成できる', () => {
      // Act & Assert
      expect(() => new StorageLocation(StorageType.REFRIGERATED)).not.toThrow()
      expect(() => new StorageLocation(StorageType.FROZEN)).not.toThrow()
      expect(() => new StorageLocation(StorageType.ROOM_TEMPERATURE)).not.toThrow()
    })
  })

  describe('equals', () => {
    it('同じタイプと詳細の場合trueを返す', () => {
      // Arrange
      const location1 = new StorageLocation(StorageType.REFRIGERATED, '野菜室')
      const location2 = new StorageLocation(StorageType.REFRIGERATED, '野菜室')

      // Act & Assert
      expect(location1.equals(location2)).toBe(true)
    })

    it('タイプが異なる場合falseを返す', () => {
      // Arrange
      const location1 = new StorageLocation(StorageType.REFRIGERATED, '野菜室')
      const location2 = new StorageLocation(StorageType.FROZEN, '野菜室')

      // Act & Assert
      expect(location1.equals(location2)).toBe(false)
    })

    it('詳細が異なる場合falseを返す', () => {
      // Arrange
      const location1 = new StorageLocation(StorageType.REFRIGERATED, '野菜室')
      const location2 = new StorageLocation(StorageType.REFRIGERATED, 'チルド室')

      // Act & Assert
      expect(location1.equals(location2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('タイプのみの場合、タイプの表示名を返す', () => {
      // Arrange
      const location = new StorageLocation(StorageType.REFRIGERATED)

      // Act & Assert
      expect(location.toString()).toBe('冷蔵')
    })

    it('詳細がある場合、タイプと詳細を組み合わせて返す', () => {
      // Arrange
      const location = new StorageLocation(StorageType.REFRIGERATED, '野菜室')

      // Act & Assert
      expect(location.toString()).toBe('冷蔵（野菜室）')
    })

    it('すべてのタイプで正しい表示名を返す', () => {
      // Act & Assert
      expect(new StorageLocation(StorageType.REFRIGERATED).toString()).toBe('冷蔵')
      expect(new StorageLocation(StorageType.FROZEN).toString()).toBe('冷凍')
      expect(new StorageLocation(StorageType.ROOM_TEMPERATURE).toString()).toBe('常温')
    })
  })
})
