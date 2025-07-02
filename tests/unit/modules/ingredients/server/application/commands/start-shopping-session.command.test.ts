import { describe, expect, it } from 'vitest'

import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'
import { DeviceType, ShoppingLocation } from '@/modules/ingredients/server/domain/value-objects'

describe('StartShoppingSessionCommand', () => {
  describe('constructor', () => {
    it('正しいユーザーIDでコマンドを作成できる', () => {
      // Given: 有効なユーザーID
      const userId = 'usr_test123'

      // When: コマンドを作成
      const command = new StartShoppingSessionCommand(userId)

      // Then: 正しく作成される
      expect(command.userId).toBe(userId)
      expect(command.deviceType).toBeUndefined()
      expect(command.location).toBeUndefined()
    })

    it('deviceTypeとlocationを含むコマンドを作成できる', () => {
      // Given: 有効なパラメータ
      const userId = 'usr_test123'
      const deviceType = DeviceType.MOBILE
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // When: コマンドを作成
      const command = new StartShoppingSessionCommand(userId, deviceType, location)

      // Then: 正しく作成される
      expect(command.userId).toBe(userId)
      expect(command.deviceType).toBe(deviceType)
      expect(command.location).toBe(location)
    })

    it('deviceTypeのみを含むコマンドを作成できる', () => {
      // Given: deviceTypeのみ
      const userId = 'usr_test123'
      const deviceType = DeviceType.TABLET

      // When: コマンドを作成
      const command = new StartShoppingSessionCommand(userId, deviceType)

      // Then: 正しく作成される
      expect(command.userId).toBe(userId)
      expect(command.deviceType).toBe(deviceType)
      expect(command.location).toBeUndefined()
    })

    it('locationのみを含むコマンドを作成できる', () => {
      // Given: locationのみ
      const userId = 'usr_test123'
      const location = ShoppingLocation.create({
        latitude: 34.6851,
        longitude: 135.1815,
      })

      // When: コマンドを作成
      const command = new StartShoppingSessionCommand(userId, undefined, location)

      // Then: 正しく作成される
      expect(command.userId).toBe(userId)
      expect(command.deviceType).toBeUndefined()
      expect(command.location).toBe(location)
    })
  })
})
