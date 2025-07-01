import { describe, it, expect } from 'vitest'

import { ShoppingLocation } from '@/modules/ingredients/server/domain/value-objects/shopping-location.vo'

describe('ShoppingLocation', () => {
  describe('create', () => {
    it('有効な緯度経度で作成できる', () => {
      // When
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      // Then
      expect(location.getLatitude()).toBe(35.6762)
      expect(location.getLongitude()).toBe(139.6503)
      expect(location.getName()).toBeNull()
    })

    it('名前付きで作成できる', () => {
      // When
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // Then
      expect(location.getLatitude()).toBe(35.6762)
      expect(location.getLongitude()).toBe(139.6503)
      expect(location.getName()).toBe('東京駅前スーパー')
    })

    it('緯度が範囲外の場合はエラーになる', () => {
      // When & Then
      expect(() =>
        ShoppingLocation.create({
          latitude: 91,
          longitude: 139.6503,
        })
      ).toThrow('緯度は-90から90の範囲で指定してください: 91')

      expect(() =>
        ShoppingLocation.create({
          latitude: -91,
          longitude: 139.6503,
        })
      ).toThrow('緯度は-90から90の範囲で指定してください: -91')
    })

    it('経度が範囲外の場合はエラーになる', () => {
      // When & Then
      expect(() =>
        ShoppingLocation.create({
          latitude: 35.6762,
          longitude: 181,
        })
      ).toThrow('経度は-180から180の範囲で指定してください: 181')

      expect(() =>
        ShoppingLocation.create({
          latitude: 35.6762,
          longitude: -181,
        })
      ).toThrow('経度は-180から180の範囲で指定してください: -181')
    })

    it('名前が100文字を超える場合はエラーになる', () => {
      // Given
      const longName = 'あ'.repeat(101)

      // When & Then
      expect(() =>
        ShoppingLocation.create({
          latitude: 35.6762,
          longitude: 139.6503,
          name: longName,
        })
      ).toThrow('場所の名前は100文字以内で指定してください')
    })

    it('空文字の名前の場合はnullとして扱われる', () => {
      // When
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '',
      })

      // Then
      expect(location.getName()).toBeNull()
    })
  })

  describe('getCoordinates', () => {
    it('座標を取得できる', () => {
      // Given
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      // When
      const coordinates = location.getCoordinates()

      // Then
      expect(coordinates).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
      })
    })
  })

  describe('getDistanceTo', () => {
    it('他の場所との距離を計算できる', () => {
      // Given - 東京駅とスカイツリーの座標
      const tokyoStation = ShoppingLocation.create({
        latitude: 35.6812,
        longitude: 139.7671,
      })
      const skytree = ShoppingLocation.create({
        latitude: 35.7101,
        longitude: 139.8107,
      })

      // When
      const distance = tokyoStation.getDistanceTo(skytree)

      // Then - 大体6-7kmの距離
      expect(distance).toBeGreaterThan(5)
      expect(distance).toBeLessThan(8)
    })

    it('同じ場所の場合は距離0を返す', () => {
      // Given
      const location1 = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })
      const location2 = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      // When
      const distance = location1.getDistanceTo(location2)

      // Then
      expect(distance).toBe(0)
    })
  })

  describe('equals', () => {
    it('同じ座標と名前の場合はtrueを返す', () => {
      // Given
      const location1 = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })
      const location2 = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // When & Then
      expect(location1.equals(location2)).toBe(true)
    })

    it('座標が異なる場合はfalseを返す', () => {
      // Given
      const location1 = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })
      const location2 = ShoppingLocation.create({
        latitude: 35.6763,
        longitude: 139.6503,
      })

      // When & Then
      expect(location1.equals(location2)).toBe(false)
    })

    it('名前が異なる場合はfalseを返す', () => {
      // Given
      const location1 = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: 'スーパーA',
      })
      const location2 = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: 'スーパーB',
      })

      // When & Then
      expect(location1.equals(location2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('名前がある場合は名前を含む文字列を返す', () => {
      // Given
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // When
      const result = location.toString()

      // Then
      expect(result).toBe('東京駅前スーパー (35.6762, 139.6503)')
    })

    it('名前がない場合は座標のみの文字列を返す', () => {
      // Given
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      // When
      const result = location.toString()

      // Then
      expect(result).toBe('(35.6762, 139.6503)')
    })
  })
})
