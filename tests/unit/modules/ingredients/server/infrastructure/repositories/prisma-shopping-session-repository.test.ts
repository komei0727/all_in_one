import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PrismaClient } from '@/generated/prisma'
import {
  SessionStatus,
  ShoppingSessionId,
  DeviceType,
  ShoppingLocation,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { CheckedItemBuilder, ShoppingSessionBuilder } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

// Prismaクライアントのモック
vi.mock('@/generated/prisma', async () => {
  const actual = await vi.importActual('@/generated/prisma')
  return {
    ...actual,
    PrismaClient: vi.fn(() => ({
      shoppingSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      shoppingSessionItem: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    })),
  }
})

describe('PrismaShoppingSessionRepository', () => {
  let prismaClient: PrismaClient
  let repository: PrismaShoppingSessionRepository

  beforeEach(() => {
    prismaClient = {
      shoppingSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      shoppingSessionItem: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        // トランザクション内のコールバックを実行
        return cb(prismaClient)
      }),
    } as any
    repository = new PrismaShoppingSessionRepository(prismaClient)
  })

  describe('save', () => {
    it('新しいセッションを保存できる', async () => {
      // Arrange
      const session = new ShoppingSessionBuilder()
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([])
        .build()

      const mockPrismaSession = {
        id: session.getId().getValue(),
        userId: session.getUserId(),
        status: 'ACTIVE' as const,
        startedAt: session.getStartedAt(),
        completedAt: null,
        deviceType: null,
        locationName: null,
        locationLat: null,
        locationLng: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prismaClient.shoppingSession.create).mockResolvedValueOnce(mockPrismaSession)

      // Act
      const savedSession = await repository.save(session)

      // Assert
      expect(savedSession.getId().getValue()).toBe(session.getId().getValue())
      expect(savedSession.getUserId()).toBe(session.getUserId())
      expect(savedSession.getStatus().getValue()).toBe('ACTIVE')
      expect(prismaClient.shoppingSession.create).toHaveBeenCalledWith({
        data: {
          id: session.getId().getValue(),
          userId: session.getUserId(),
          status: 'ACTIVE',
          startedAt: session.getStartedAt(),
          completedAt: null,
          deviceType: undefined,
          locationName: null,
          locationLat: null,
          locationLng: null,
          metadata: undefined,
        },
      })
    })

    it('確認済みアイテムを含むセッションを保存できる', async () => {
      // Arrange
      const checkedItem = new CheckedItemBuilder().build()
      const session = new ShoppingSessionBuilder()
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([checkedItem])
        .build()

      const mockPrismaSession = {
        id: session.getId().getValue(),
        userId: session.getUserId(),
        status: 'ACTIVE' as const,
        startedAt: session.getStartedAt(),
        completedAt: null,
        deviceType: null,
        locationName: null,
        locationLat: null,
        locationLng: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prismaClient.shoppingSession.create).mockResolvedValueOnce(mockPrismaSession)
      vi.mocked(prismaClient.shoppingSessionItem.createMany).mockResolvedValueOnce({
        count: 1,
      })

      // Act
      const savedSession = await repository.save(session)

      // Assert
      expect(savedSession.getId().getValue()).toBe(session.getId().getValue())
      expect(prismaClient.shoppingSessionItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            sessionId: session.getId().getValue(),
            ingredientId: checkedItem.getIngredientId().getValue(),
            ingredientName: checkedItem.getIngredientName().getValue(),
            stockStatus: checkedItem.getStockStatus().getValue(),
            expiryStatus: checkedItem.getExpiryStatus().getValue(),
            checkedAt: checkedItem.getCheckedAt(),
            metadata: undefined,
          },
        ],
      })
    })
  })

  describe('findById', () => {
    it('IDでセッションを取得できる', async () => {
      // Arrange
      const sessionId = new ShoppingSessionId(testDataHelpers.shoppingSessionId())
      const userId = testDataHelpers.userId()

      const mockPrismaSession = {
        id: sessionId.getValue(),
        userId,
        status: 'ACTIVE' as const,
        startedAt: new Date(),
        completedAt: null,
        deviceType: null,
        locationName: null,
        locationLat: null,
        locationLng: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockSessionItems = [
        {
          id: testDataHelpers.cuid(),
          sessionId: sessionId.getValue(),
          ingredientId: testDataHelpers.ingredientId(),
          ingredientName: testDataHelpers.ingredientName(),
          stockStatus: 'IN_STOCK' as const,
          expiryStatus: 'FRESH' as const,
          checkedAt: new Date(),
          metadata: null,
        },
      ]

      vi.mocked(prismaClient.shoppingSession.findUnique).mockResolvedValueOnce(mockPrismaSession)
      vi.mocked(prismaClient.shoppingSessionItem.findMany).mockResolvedValueOnce(mockSessionItems)

      // Act
      const session = await repository.findById(sessionId)

      // Assert
      expect(session).not.toBeNull()
      expect(session?.getId().getValue()).toBe(sessionId.getValue())
      expect(session?.getUserId()).toBe(userId)
      expect(session?.getStatus().getValue()).toBe('ACTIVE')
      expect(session?.getCheckedItems()).toHaveLength(1)
      expect(prismaClient.shoppingSession.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId.getValue() },
      })
      expect(prismaClient.shoppingSessionItem.findMany).toHaveBeenCalledWith({
        where: { sessionId: sessionId.getValue() },
        orderBy: { checkedAt: 'desc' },
      })
    })

    it('存在しないIDの場合はnullを返す', async () => {
      // Arrange
      const sessionId = new ShoppingSessionId(testDataHelpers.shoppingSessionId())

      vi.mocked(prismaClient.shoppingSession.findUnique).mockResolvedValueOnce(null)

      // Act
      const session = await repository.findById(sessionId)

      // Assert
      expect(session).toBeNull()
      expect(prismaClient.shoppingSessionItem.findMany).not.toHaveBeenCalled()
    })
  })

  describe('findActiveByUserId', () => {
    it('ユーザーのアクティブなセッションを取得できる', async () => {
      // Arrange
      const userId = testDataHelpers.userId()
      const sessionId = testDataHelpers.shoppingSessionId()

      const mockPrismaSession = {
        id: sessionId,
        userId,
        status: 'ACTIVE' as const,
        startedAt: new Date(),
        completedAt: null,
        deviceType: null,
        locationName: null,
        locationLat: null,
        locationLng: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prismaClient.shoppingSession.findFirst).mockResolvedValueOnce(mockPrismaSession)
      vi.mocked(prismaClient.shoppingSessionItem.findMany).mockResolvedValueOnce([])

      // Act
      const session = await repository.findActiveByUserId(userId)

      // Assert
      expect(session).not.toBeNull()
      expect(session?.getUserId()).toBe(userId)
      expect(session?.getStatus().getValue()).toBe('ACTIVE')
      expect(prismaClient.shoppingSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'ACTIVE',
        },
      })
    })

    it('アクティブなセッションがない場合はnullを返す', async () => {
      // Arrange
      const userId = testDataHelpers.userId()

      vi.mocked(prismaClient.shoppingSession.findFirst).mockResolvedValueOnce(null)

      // Act
      const session = await repository.findActiveByUserId(userId)

      // Assert
      expect(session).toBeNull()
    })
  })

  describe('update', () => {
    it('セッションを更新できる', async () => {
      // Arrange
      const session = new ShoppingSessionBuilder()
        .withStatus(SessionStatus.COMPLETED)
        .withCompletedAt(new Date())
        .build()

      const mockUpdatedSession = {
        id: session.getId().getValue(),
        userId: session.getUserId(),
        status: 'COMPLETED' as const,
        startedAt: session.getStartedAt(),
        completedAt: session.getCompletedAt(),
        deviceType: null,
        locationName: null,
        locationLat: null,
        locationLng: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prismaClient.shoppingSession.update).mockResolvedValueOnce(mockUpdatedSession)
      vi.mocked(prismaClient.shoppingSessionItem.deleteMany).mockResolvedValueOnce({
        count: 0,
      })
      vi.mocked(prismaClient.shoppingSessionItem.createMany).mockResolvedValueOnce({
        count: 0,
      })

      // Act
      const updatedSession = await repository.update(session)

      // Assert
      expect(updatedSession.getStatus().getValue()).toBe('COMPLETED')
      expect(updatedSession.getCompletedAt()).not.toBeNull()
      expect(prismaClient.shoppingSession.update).toHaveBeenCalledWith({
        where: { id: session.getId().getValue() },
        data: {
          status: 'COMPLETED',
          completedAt: session.getCompletedAt(),
          deviceType: undefined,
          locationName: null,
          locationLat: null,
          locationLng: null,
          metadata: undefined,
        },
      })
    })

    it('確認済みアイテムの更新も行える', async () => {
      // Arrange
      const checkedItem = new CheckedItemBuilder().build()
      const session = new ShoppingSessionBuilder().withCheckedItems([checkedItem]).build()

      const mockUpdatedSession = {
        id: session.getId().getValue(),
        userId: session.getUserId(),
        status: 'ACTIVE' as const,
        startedAt: session.getStartedAt(),
        completedAt: null,
        deviceType: null,
        locationName: null,
        locationLat: null,
        locationLng: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prismaClient.shoppingSession.update).mockResolvedValueOnce(mockUpdatedSession)
      vi.mocked(prismaClient.shoppingSessionItem.deleteMany).mockResolvedValueOnce({
        count: 0,
      })
      vi.mocked(prismaClient.shoppingSessionItem.createMany).mockResolvedValueOnce({
        count: 1,
      })

      // Act
      const updatedSession = await repository.update(session)

      // Assert
      expect(updatedSession.getCheckedItems()).toHaveLength(1)
      expect(prismaClient.shoppingSessionItem.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: session.getId().getValue() },
      })
      expect(prismaClient.shoppingSessionItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            sessionId: session.getId().getValue(),
            ingredientId: checkedItem.getIngredientId().getValue(),
          }),
        ]),
      })
    })
  })

  describe('deviceType and location mapping', () => {
    it('deviceTypeとlocationを含むセッションを保存できる', async () => {
      // Arrange
      const sessionId = ShoppingSessionId.create()
      const deviceType = DeviceType.MOBILE
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
        name: '東京駅前スーパー',
      })

      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withDeviceType(deviceType)
        .withLocation(location)
        .build()

      const mockSessionData = {
        id: sessionId.getValue(),
        userId: session.getUserId(),
        status: 'ACTIVE',
        startedAt: session.getStartedAt(),
        completedAt: null,
        deviceType: 'MOBILE',
        locationName: '東京駅前スーパー',
        locationLat: 35.6762,
        locationLng: 139.6503,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionItems: [],
      }

      ;(prismaClient.shoppingSession.create as any).mockResolvedValue(mockSessionData)

      // Act
      const savedSession = await repository.save(session)

      // Assert
      expect(savedSession.getDeviceType()).toBe(deviceType)
      expect(savedSession.getLocation()).toStrictEqual(location)
      expect(prismaClient.shoppingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceType: 'MOBILE',
          locationName: '東京駅前スーパー',
          locationLat: 35.6762,
          locationLng: 139.6503,
        }),
      })
    })

    it('deviceTypeのみを含むセッションを保存できる', async () => {
      // Arrange
      const sessionId = ShoppingSessionId.create()
      const deviceType = DeviceType.TABLET

      const session = new ShoppingSessionBuilder()
        .withId(sessionId)
        .withDeviceType(deviceType)
        .build()

      const mockSessionData = {
        id: sessionId.getValue(),
        userId: session.getUserId(),
        status: 'ACTIVE',
        startedAt: session.getStartedAt(),
        completedAt: null,
        deviceType: 'TABLET',
        locationName: null,
        locationLat: null,
        locationLng: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionItems: [],
      }

      ;(prismaClient.shoppingSession.create as any).mockResolvedValue(mockSessionData)

      // Act
      const savedSession = await repository.save(session)

      // Assert
      expect(savedSession.getDeviceType()).toBe(deviceType)
      expect(savedSession.getLocation()).toBeNull()
      expect(prismaClient.shoppingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceType: 'TABLET',
          locationName: null,
          locationLat: null,
          locationLng: null,
        }),
      })
    })

    it('locationのみを含むセッションを保存できる', async () => {
      // Arrange
      const sessionId = ShoppingSessionId.create()
      const location = ShoppingLocation.create({
        latitude: 35.6762,
        longitude: 139.6503,
      })

      const session = new ShoppingSessionBuilder().withId(sessionId).withLocation(location).build()

      const mockSessionData = {
        id: sessionId.getValue(),
        userId: session.getUserId(),
        status: 'ACTIVE',
        startedAt: session.getStartedAt(),
        completedAt: null,
        deviceType: null,
        locationName: null,
        locationLat: 35.6762,
        locationLng: 139.6503,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionItems: [],
      }

      ;(prismaClient.shoppingSession.create as any).mockResolvedValue(mockSessionData)

      // Act
      const savedSession = await repository.save(session)

      // Assert
      expect(savedSession.getDeviceType()).toBeNull()
      expect(savedSession.getLocation()).toStrictEqual(location)
      expect(prismaClient.shoppingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceType: undefined,
          locationName: null,
          locationLat: 35.6762,
          locationLng: 139.6503,
        }),
      })
    })
  })
})
