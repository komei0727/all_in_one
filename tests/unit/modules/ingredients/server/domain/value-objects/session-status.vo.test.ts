import { describe, it, expect } from 'vitest'

import { SessionStatus } from '@/modules/ingredients/server/domain/value-objects/session-status.vo'

describe('SessionStatus', () => {
  describe('定数', () => {
    it('ACTIVEステータスが定義されている', () => {
      // Then: ACTIVEステータスが存在
      expect(SessionStatus.ACTIVE).toBeInstanceOf(SessionStatus)
      expect(SessionStatus.ACTIVE.getValue()).toBe('ACTIVE')
    })

    it('COMPLETEDステータスが定義されている', () => {
      // Then: COMPLETEDステータスが存在
      expect(SessionStatus.COMPLETED).toBeInstanceOf(SessionStatus)
      expect(SessionStatus.COMPLETED.getValue()).toBe('COMPLETED')
    })

    it('ABANDONEDステータスが定義されている', () => {
      // Then: ABANDONEDステータスが存在
      expect(SessionStatus.ABANDONED).toBeInstanceOf(SessionStatus)
      expect(SessionStatus.ABANDONED.getValue()).toBe('ABANDONED')
    })
  })

  describe('from', () => {
    it('有効なステータス文字列から作成できる', () => {
      // When: 文字列からステータスを作成
      const activeStatus = SessionStatus.from('ACTIVE')
      const completedStatus = SessionStatus.from('COMPLETED')
      const abandonedStatus = SessionStatus.from('ABANDONED')

      // Then: 正しいステータスが作成される
      expect(activeStatus.equals(SessionStatus.ACTIVE)).toBe(true)
      expect(completedStatus.equals(SessionStatus.COMPLETED)).toBe(true)
      expect(abandonedStatus.equals(SessionStatus.ABANDONED)).toBe(true)
    })

    it('無効なステータス文字列は拒否される', () => {
      // When/Then: 無効なステータスでエラー
      expect(() => SessionStatus.from('INVALID')).toThrow('無効なセッションステータス: INVALID')
    })

    it('空文字列は拒否される', () => {
      // When/Then: 空文字列でエラー
      expect(() => SessionStatus.from('')).toThrow('無効なセッションステータス: ')
    })

    it('nullやundefinedは拒否される', () => {
      // When/Then: nullやundefinedでエラー
      expect(() => SessionStatus.from(null as any)).toThrow()
      expect(() => SessionStatus.from(undefined as any)).toThrow()
    })
  })

  describe('状態判定メソッド', () => {
    describe('isActive', () => {
      it('ACTIVEステータスの場合はtrueを返す', () => {
        // Then: ACTIVEの場合true
        expect(SessionStatus.ACTIVE.isActive()).toBe(true)
        expect(SessionStatus.COMPLETED.isActive()).toBe(false)
        expect(SessionStatus.ABANDONED.isActive()).toBe(false)
      })
    })

    describe('isCompleted', () => {
      it('COMPLETEDステータスの場合はtrueを返す', () => {
        // Then: COMPLETEDの場合true
        expect(SessionStatus.ACTIVE.isCompleted()).toBe(false)
        expect(SessionStatus.COMPLETED.isCompleted()).toBe(true)
        expect(SessionStatus.ABANDONED.isCompleted()).toBe(false)
      })
    })

    describe('isAbandoned', () => {
      it('ABANDONEDステータスの場合はtrueを返す', () => {
        // Then: ABANDONEDの場合true
        expect(SessionStatus.ACTIVE.isAbandoned()).toBe(false)
        expect(SessionStatus.COMPLETED.isAbandoned()).toBe(false)
        expect(SessionStatus.ABANDONED.isAbandoned()).toBe(true)
      })
    })

    describe('isFinished', () => {
      it('COMPLETEDまたはABANDONEDの場合はtrueを返す', () => {
        // Then: 終了状態の判定
        expect(SessionStatus.ACTIVE.isFinished()).toBe(false)
        expect(SessionStatus.COMPLETED.isFinished()).toBe(true)
        expect(SessionStatus.ABANDONED.isFinished()).toBe(true)
      })
    })
  })

  describe('状態遷移判定', () => {
    describe('canTransitionTo', () => {
      it('ACTIVEからCOMPLETEDへの遷移は可能', () => {
        // Then: 正常完了への遷移可能
        expect(SessionStatus.ACTIVE.canTransitionTo(SessionStatus.COMPLETED)).toBe(true)
      })

      it('ACTIVEからABANDONEDへの遷移は可能', () => {
        // Then: 中断への遷移可能
        expect(SessionStatus.ACTIVE.canTransitionTo(SessionStatus.ABANDONED)).toBe(true)
      })

      it('COMPLETEDからの遷移は不可能', () => {
        // Then: 完了後の遷移は全て不可
        expect(SessionStatus.COMPLETED.canTransitionTo(SessionStatus.ACTIVE)).toBe(false)
        expect(SessionStatus.COMPLETED.canTransitionTo(SessionStatus.ABANDONED)).toBe(false)
        expect(SessionStatus.COMPLETED.canTransitionTo(SessionStatus.COMPLETED)).toBe(false)
      })

      it('ABANDONEDからの遷移は不可能', () => {
        // Then: 中断後の遷移は全て不可
        expect(SessionStatus.ABANDONED.canTransitionTo(SessionStatus.ACTIVE)).toBe(false)
        expect(SessionStatus.ABANDONED.canTransitionTo(SessionStatus.COMPLETED)).toBe(false)
        expect(SessionStatus.ABANDONED.canTransitionTo(SessionStatus.ABANDONED)).toBe(false)
      })

      it('同じステータスへの遷移は不可能', () => {
        // Then: 同一ステータスへの遷移不可
        expect(SessionStatus.ACTIVE.canTransitionTo(SessionStatus.ACTIVE)).toBe(false)
      })
    })
  })

  describe('equals', () => {
    it('同じステータスの場合はtrueを返す', () => {
      // Given: 同じステータス
      const status1 = SessionStatus.from('ACTIVE')
      const status2 = SessionStatus.from('ACTIVE')

      // Then: 等価と判定
      expect(status1.equals(status2)).toBe(true)
      expect(SessionStatus.ACTIVE.equals(status1)).toBe(true)
    })

    it('異なるステータスの場合はfalseを返す', () => {
      // Then: 非等価と判定
      expect(SessionStatus.ACTIVE.equals(SessionStatus.COMPLETED)).toBe(false)
      expect(SessionStatus.COMPLETED.equals(SessionStatus.ABANDONED)).toBe(false)
    })
  })

  describe('toString', () => {
    it('ステータス文字列を返す', () => {
      // Then: getValue()と同じ値を返す
      expect(SessionStatus.ACTIVE.toString()).toBe('ACTIVE')
      expect(SessionStatus.COMPLETED.toString()).toBe('COMPLETED')
      expect(SessionStatus.ABANDONED.toString()).toBe('ABANDONED')
    })
  })
})
