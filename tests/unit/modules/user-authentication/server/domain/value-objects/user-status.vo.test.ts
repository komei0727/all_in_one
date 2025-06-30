import { describe, it, expect } from 'vitest'

import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'
import { UserStatusBuilder } from '@tests/__fixtures__/builders'

// テスト対象のUserStatusクラス

describe('UserStatus値オブジェクト', () => {
  describe('正常な値での作成', () => {
    it('ACTIVEステータスで作成できる', () => {
      // Arrange（準備）
      const activeStatus = 'ACTIVE'

      // Act（実行）
      const status = new UserStatus(activeStatus)

      // Assert（検証）
      expect(status.getValue()).toBe('ACTIVE')
      expect(status.isActive()).toBe(true)
      expect(status.isDeactivated()).toBe(false)
      expect(status.canLogin()).toBe(true)
    })

    it('DEACTIVATEDステータスで作成できる', () => {
      // Arrange（準備）
      const deactivatedStatus = 'DEACTIVATED'

      // Act（実行）
      const status = new UserStatus(deactivatedStatus)

      // Assert（検証）
      expect(status.getValue()).toBe('DEACTIVATED')
      expect(status.isActive()).toBe(false)
      expect(status.isDeactivated()).toBe(true)
      expect(status.canLogin()).toBe(false)
    })

    it('テストデータビルダーで生成したステータスで作成できる', () => {
      // Arrange（準備）
      const testStatusData = new UserStatusBuilder().withActive().build()

      // Act（実行）
      const status = new UserStatus(testStatusData.status as any)

      // Assert（検証）
      expect(status.getValue()).toBe('ACTIVE')
      expect(status.isActive()).toBe(true)
    })
  })

  describe('不正な値での作成', () => {
    it('無効なステータスで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidStatus = 'INVALID_STATUS'

      // Act & Assert（実行 & 検証）
      expect(() => new UserStatus(invalidStatus as any)).toThrow('無効なユーザーステータスです')
    })

    it('空文字で作成するとエラーが発生する', () => {
      // Arrange（準備）
      const emptyStatus = ''

      // Act & Assert（実行 & 検証）
      expect(() => new UserStatus(emptyStatus as any)).toThrow('無効なユーザーステータスです')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const nullStatus = null as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserStatus(nullStatus)).toThrow('statusは必須です')
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const undefinedStatus = undefined as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserStatus(undefinedStatus)).toThrow('statusは必須です')
    })
  })

  describe('ステータス判定メソッド', () => {
    it('ACTIVEステータスの判定が正しく動作する', () => {
      // Arrange（準備）
      const activeStatusData = new UserStatusBuilder().withActive().build()

      // Act（実行）
      const status = new UserStatus(activeStatusData.status as any)

      // Assert（検証）
      expect(status.isActive()).toBe(true)
      expect(status.isDeactivated()).toBe(false)
      expect(status.canLogin()).toBe(true)
    })

    it('DEACTIVATEDステータスの判定が正しく動作する', () => {
      // Arrange（準備）
      const deactivatedStatusData = new UserStatusBuilder().withDeactivated().build()

      // Act（実行）
      const status = new UserStatus(deactivatedStatusData.status as any)

      // Assert（検証）
      expect(status.isActive()).toBe(false)
      expect(status.isDeactivated()).toBe(true)
      expect(status.canLogin()).toBe(false)
    })
  })

  describe('ステータス変更', () => {
    it('アクティブ化した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const deactivatedStatusData = new UserStatusBuilder().withDeactivated().build()

      // Act（実行）
      const original = new UserStatus(deactivatedStatusData.status as any)
      const activated = original.activate()

      // Assert（検証）
      expect(original.isDeactivated()).toBe(true) // 元は変更されない
      expect(activated.isActive()).toBe(true) // 新しいインスタンスはアクティブ
      expect(activated.canLogin()).toBe(true)
    })

    it('無効化した新しいインスタンスが作成される', () => {
      // Arrange（準備）
      const activeStatusData = new UserStatusBuilder().withActive().build()

      // Act（実行）
      const original = new UserStatus(activeStatusData.status as any)
      const deactivated = original.deactivate()

      // Assert（検証）
      expect(original.isActive()).toBe(true) // 元は変更されない
      expect(deactivated.isDeactivated()).toBe(true) // 新しいインスタンスは無効化
      expect(deactivated.canLogin()).toBe(false)
    })
  })

  describe('等価性比較', () => {
    it('同じステータスのUserStatusは等しい', () => {
      // Arrange（準備）
      const status = 'ACTIVE'

      // Act（実行）
      const status1 = new UserStatus(status)
      const status2 = new UserStatus(status)

      // Assert（検証）
      expect(status1.equals(status2)).toBe(true)
    })

    it('異なるステータスのUserStatusは等しくない', () => {
      // Arrange（準備）
      const status1 = 'ACTIVE'
      const status2 = 'DEACTIVATED'

      // Act（実行）
      const userStatus1 = new UserStatus(status1)
      const userStatus2 = new UserStatus(status2)

      // Assert（検証）
      expect(userStatus1.equals(userStatus2)).toBe(false)
    })

    it('UserStatus以外のオブジェクトとの比較はfalseを返す', () => {
      // Arrange（準備）
      const status = new UserStatus('ACTIVE')
      const notUserStatus = { value: 'ACTIVE' } as any
      const stringValue = 'ACTIVE' as any
      const nullValue = null as any
      const undefinedValue = undefined as any

      // Act & Assert（実行 & 検証）
      expect(status.equals(notUserStatus)).toBe(false)
      expect(status.equals(stringValue)).toBe(false)
      expect(status.equals(nullValue)).toBe(false)
      expect(status.equals(undefinedValue)).toBe(false)
    })
  })

  describe('ファクトリーメソッド', () => {
    it('createActive()でアクティブステータスを作成できる', () => {
      // Act（実行）
      const status = UserStatus.createActive()

      // Assert（検証）
      expect(status.getValue()).toBe('ACTIVE')
      expect(status.isActive()).toBe(true)
      expect(status.canLogin()).toBe(true)
    })

    it('createDeactivated()で無効化ステータスを作成できる', () => {
      // Act（実行）
      const status = UserStatus.createDeactivated()

      // Assert（検証）
      expect(status.getValue()).toBe('DEACTIVATED')
      expect(status.isDeactivated()).toBe(true)
      expect(status.canLogin()).toBe(false)
    })
  })
})
