import { faker } from '@faker-js/faker/locale/ja'
import { describe, expect, it, beforeEach, vi } from 'vitest'

import { ShoppingSession } from '@/modules/ingredients/server/domain/entities/shopping-session.entity'
import { ShoppingSessionStarted } from '@/modules/ingredients/server/domain/events'
import { BusinessRuleException } from '@/modules/ingredients/server/domain/exceptions'
import { ShoppingSessionFactory } from '@/modules/ingredients/server/domain/factories/shopping-session.factory'
import type { ShoppingSessionRepository } from '@/modules/ingredients/server/domain/repositories/shopping-session-repository.interface'
import {
  SessionStatus,
  DeviceType,
  ShoppingLocation,
} from '@/modules/ingredients/server/domain/value-objects'

describe('ShoppingSessionFactory', () => {
  let factory: ShoppingSessionFactory
  let mockRepository: ShoppingSessionRepository
  let userId: string

  beforeEach(() => {
    userId = faker.string.uuid()

    // リポジトリのモックを作成
    mockRepository = {
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    }

    factory = new ShoppingSessionFactory(mockRepository)
  })

  describe('create', () => {
    it('アクティブなセッションがない場合、新しいセッションを作成できる', async () => {
      // アクティブなセッションが存在しない
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(null)

      // ファクトリでセッションを作成
      const session = await factory.create(userId)

      // セッションが正しく作成されていることを検証
      expect(session).toBeInstanceOf(ShoppingSession)
      expect(session.getUserId()).toBe(userId)
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE)
      expect(session.getCheckedItems()).toEqual([])

      // ShoppingSessionStartedイベントが発行されていることを検証
      const events = session.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(ShoppingSessionStarted)

      // リポジトリが呼ばれたことを検証
      expect(mockRepository.findActiveByUserId).toHaveBeenCalledWith(userId)
    })

    it('既にアクティブなセッションがある場合、エラーを投げる', async () => {
      // アクティブなセッションが既に存在する
      const existingSession = {} as ShoppingSession // モックとして空のオブジェクトを使用
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(existingSession)

      // ファクトリでセッション作成を試みる
      await expect(factory.create(userId)).rejects.toThrow(BusinessRuleException)
      await expect(factory.create(userId)).rejects.toThrow(
        '同一ユーザーで同時にアクティブなセッションは1つのみです'
      )

      // リポジトリが呼ばれたことを検証
      expect(mockRepository.findActiveByUserId).toHaveBeenCalledWith(userId)
    })

    it('完了済みセッションがある場合は新しいセッションを作成できる', async () => {
      // アクティブなセッションが存在しない（完了済みセッションはあってもOK）
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(null)

      // ファクトリでセッションを作成
      const session = await factory.create(userId)

      // セッションが正しく作成されていることを検証
      expect(session).toBeInstanceOf(ShoppingSession)
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE)
    })
  })

  describe('createWithCheck', () => {
    it('重複チェックを行ってセッションを作成する', async () => {
      // アクティブなセッションが存在しない
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(null)

      // ファクトリでセッションを作成
      const session = await factory.createWithCheck(userId)

      // セッションが正しく作成されていることを検証
      expect(session).toBeInstanceOf(ShoppingSession)
      expect(session.getUserId()).toBe(userId)
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE)

      // リポジトリが呼ばれたことを検証
      expect(mockRepository.findActiveByUserId).toHaveBeenCalledWith(userId)
    })
  })

  describe('create with deviceType and location', () => {
    it('deviceTypeとlocationを指定してセッションを作成できる', async () => {
      // Given
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(null)
      const deviceType = DeviceType.MOBILE
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      // When
      const session = await factory.create(userId, { deviceType, location })

      // Then
      expect(session).toBeInstanceOf(ShoppingSession)
      expect(session.getUserId()).toBe(userId)
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE)
      expect(session.getDeviceType()).toBe(deviceType)
      expect(session.getLocation()).toBe(location)

      // リポジトリが呼ばれたことを検証
      expect(mockRepository.findActiveByUserId).toHaveBeenCalledWith(userId)
    })

    it('deviceTypeのみ指定してセッションを作成できる', async () => {
      // Given
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(null)
      const deviceType = DeviceType.TABLET

      // When
      const session = await factory.create(userId, { deviceType })

      // Then
      expect(session.getDeviceType()).toBe(deviceType)
      expect(session.getLocation()).toBeNull()
    })

    it('locationのみ指定してセッションを作成できる', async () => {
      // Given
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(null)
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      // When
      const session = await factory.create(userId, { location })

      // Then
      expect(session.getDeviceType()).toBeNull()
      expect(session.getLocation()).toBe(location)
    })

    it('オプションパラメータなしでセッションを作成できる', async () => {
      // Given
      mockRepository.findActiveByUserId = vi.fn().mockResolvedValue(null)

      // When
      const session = await factory.create(userId)

      // Then
      expect(session.getDeviceType()).toBeNull()
      expect(session.getLocation()).toBeNull()
    })
  })
})
