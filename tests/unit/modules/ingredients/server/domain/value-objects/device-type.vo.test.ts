import { describe, it, expect } from 'vitest'

import { DeviceType } from '@/modules/ingredients/server/domain/value-objects/device-type.vo'

describe('DeviceType', () => {
  describe('create', () => {
    it('MOBILE値で作成できる', () => {
      // When
      const deviceType = DeviceType.MOBILE

      // Then
      expect(deviceType.getValue()).toBe('MOBILE')
      expect(deviceType.isMobile()).toBe(true)
      expect(deviceType.isTablet()).toBe(false)
      expect(deviceType.isDesktop()).toBe(false)
    })

    it('TABLET値で作成できる', () => {
      // When
      const deviceType = DeviceType.TABLET

      // Then
      expect(deviceType.getValue()).toBe('TABLET')
      expect(deviceType.isMobile()).toBe(false)
      expect(deviceType.isTablet()).toBe(true)
      expect(deviceType.isDesktop()).toBe(false)
    })

    it('DESKTOP値で作成できる', () => {
      // When
      const deviceType = DeviceType.DESKTOP

      // Then
      expect(deviceType.getValue()).toBe('DESKTOP')
      expect(deviceType.isMobile()).toBe(false)
      expect(deviceType.isTablet()).toBe(false)
      expect(deviceType.isDesktop()).toBe(true)
    })
  })

  describe('fromString', () => {
    it('有効な文字列から作成できる', () => {
      // When
      const mobile = DeviceType.fromString('MOBILE')
      const tablet = DeviceType.fromString('TABLET')
      const desktop = DeviceType.fromString('DESKTOP')

      // Then
      expect(mobile.getValue()).toBe('MOBILE')
      expect(tablet.getValue()).toBe('TABLET')
      expect(desktop.getValue()).toBe('DESKTOP')
    })

    it('無効な文字列の場合はエラーになる', () => {
      // When & Then
      expect(() => DeviceType.fromString('INVALID')).toThrow('無効なデバイスタイプです: INVALID')
      expect(() => DeviceType.fromString('')).toThrow('無効なデバイスタイプです: ')
      expect(() => DeviceType.fromString('mobile')).toThrow('無効なデバイスタイプです: mobile')
    })
  })

  describe('equals', () => {
    it('同じデバイスタイプの場合はtrueを返す', () => {
      // Given
      const deviceType1 = DeviceType.MOBILE
      const deviceType2 = DeviceType.MOBILE

      // When & Then
      expect(deviceType1.equals(deviceType2)).toBe(true)
    })

    it('異なるデバイスタイプの場合はfalseを返す', () => {
      // Given
      const mobile = DeviceType.MOBILE
      const tablet = DeviceType.TABLET

      // When & Then
      expect(mobile.equals(tablet)).toBe(false)
    })
  })

  describe('getDisplayName', () => {
    it('表示名を取得できる', () => {
      // When & Then
      expect(DeviceType.MOBILE.getDisplayName()).toBe('スマートフォン')
      expect(DeviceType.TABLET.getDisplayName()).toBe('タブレット')
      expect(DeviceType.DESKTOP.getDisplayName()).toBe('デスクトップ')
    })
  })

  describe('getAllTypes', () => {
    it('すべてのデバイスタイプを取得できる', () => {
      // When
      const allTypes = DeviceType.getAllTypes()

      // Then
      expect(allTypes).toHaveLength(3)
      expect(allTypes.map((type) => type.getValue())).toEqual(['MOBILE', 'TABLET', 'DESKTOP'])
    })
  })
})
