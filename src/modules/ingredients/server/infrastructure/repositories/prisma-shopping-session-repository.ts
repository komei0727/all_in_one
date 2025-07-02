import type {
  PrismaClient,
  SessionStatus as PrismaSessionStatus,
  StockStatus as PrismaStockStatus,
  ExpiryStatus as PrismaExpiryStatus,
  DeviceType as PrismaDeviceType,
} from '@/generated/prisma'
import { PrismaErrorConverter } from '@/modules/shared/server/infrastructure/prisma-error-converter'

import { ShoppingSession } from '../../domain/entities/shopping-session.entity'
import {
  CheckedItem,
  ExpiryStatus,
  IngredientId,
  IngredientName,
  SessionStatus,
  ShoppingSessionId,
  StockStatus,
  DeviceType,
  ShoppingLocation,
} from '../../domain/value-objects'

import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'

/**
 * Prismaを使用した買い物セッションリポジトリの実装
 */
export class PrismaShoppingSessionRepository implements ShoppingSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 買い物セッションを保存
   * @param session 保存するセッション
   * @returns 保存されたセッション
   */
  async save(session: ShoppingSession): Promise<ShoppingSession> {
    return await PrismaErrorConverter.wrapOperation(
      async () => {
        // トランザクション内でセッションとアイテムを保存
        const result = await this.prisma.$transaction(async (tx) => {
          // セッションの保存
          const savedSession = await tx.shoppingSession.create({
            data: {
              id: session.getId().getValue(),
              userId: session.getUserId(),
              status: this.mapSessionStatusToPrisma(session.getStatus()),
              startedAt: session.getStartedAt(),
              completedAt: session.getCompletedAt(),
              deviceType: session.getDeviceType()?.getValue() as PrismaDeviceType | null,
              locationName: session.getLocation()?.getName() ?? null,
              locationLat: session.getLocation()?.getLatitude() ?? null,
              locationLng: session.getLocation()?.getLongitude() ?? null,
              metadata: undefined,
            },
          })

          // チェック済みアイテムの保存
          const checkedItems = session.getCheckedItems()
          if (checkedItems.length > 0) {
            await tx.shoppingSessionItem.createMany({
              data: checkedItems.map((item) => ({
                sessionId: session.getId().getValue(),
                ingredientId: item.getIngredientId().getValue(),
                ingredientName: item.getIngredientName().getValue(),
                stockStatus: this.mapStockStatusToPrisma(item.getStockStatus()),
                expiryStatus: item.getExpiryStatus()
                  ? this.mapExpiryStatusToPrisma(item.getExpiryStatus())
                  : null,
                checkedAt: item.getCheckedAt(),
                metadata: undefined,
              })),
            })
          }

          return { savedSession, checkedItems }
        })

        // エンティティの再構築
        return this.toEntity(result.savedSession, result.checkedItems)
      },
      'save',
      { sessionId: session.getId().getValue() }
    )
  }

  /**
   * IDで買い物セッションを検索
   * @param id セッションID
   * @returns セッション（見つからない場合はnull）
   */
  async findById(id: ShoppingSessionId): Promise<ShoppingSession | null> {
    // セッションの取得
    const session = await this.prisma.shoppingSession.findUnique({
      where: { id: id.getValue() },
    })

    if (!session) {
      return null
    }

    // チェック済みアイテムの取得
    const sessionItems = await this.prisma.shoppingSessionItem.findMany({
      where: { sessionId: id.getValue() },
      orderBy: { checkedAt: 'desc' },
    })

    // エンティティに変換
    const checkedItems = sessionItems.map((item) =>
      CheckedItem.create({
        ingredientId: new IngredientId(item.ingredientId),
        ingredientName: new IngredientName(item.ingredientName),
        stockStatus: this.mapPrismaStockStatusToDomain(item.stockStatus),
        expiryStatus: item.expiryStatus
          ? this.mapPrismaExpiryStatusToDomain(item.expiryStatus)
          : ExpiryStatus.FRESH,
        checkedAt: item.checkedAt,
      })
    )

    return this.toEntity(session, checkedItems)
  }

  /**
   * ユーザーIDでアクティブなセッションを検索
   * @param userId ユーザーID
   * @returns アクティブなセッション（存在しない場合はnull）
   */
  async findActiveByUserId(userId: string): Promise<ShoppingSession | null> {
    // アクティブなセッションの取得
    const session = await this.prisma.shoppingSession.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    })

    if (!session) {
      return null
    }

    // チェック済みアイテムの取得
    const sessionItems = await this.prisma.shoppingSessionItem.findMany({
      where: { sessionId: session.id },
      orderBy: { checkedAt: 'desc' },
    })

    // エンティティに変換
    const checkedItems = sessionItems.map((item) =>
      CheckedItem.create({
        ingredientId: new IngredientId(item.ingredientId),
        ingredientName: new IngredientName(item.ingredientName),
        stockStatus: this.mapPrismaStockStatusToDomain(item.stockStatus),
        expiryStatus: item.expiryStatus
          ? this.mapPrismaExpiryStatusToDomain(item.expiryStatus)
          : ExpiryStatus.FRESH,
        checkedAt: item.checkedAt,
      })
    )

    return this.toEntity(session, checkedItems)
  }

  /**
   * 買い物セッションを更新
   * @param session 更新するセッション
   * @returns 更新されたセッション
   */
  async update(session: ShoppingSession): Promise<ShoppingSession> {
    // トランザクション内でセッションとアイテムを更新
    const result = await this.prisma.$transaction(async (tx) => {
      // セッションの更新
      const updatedSession = await tx.shoppingSession.update({
        where: { id: session.getId().getValue() },
        data: {
          status: this.mapSessionStatusToPrisma(session.getStatus()),
          completedAt: session.getCompletedAt(),
          deviceType: session.getDeviceType()?.getValue() as PrismaDeviceType | null,
          locationName: session.getLocation()?.getName() ?? null,
          locationLat: session.getLocation()?.getLatitude() ?? null,
          locationLng: session.getLocation()?.getLongitude() ?? null,
          metadata: undefined,
        },
      })

      // チェック済みアイテムの更新（削除して再作成）
      await tx.shoppingSessionItem.deleteMany({
        where: { sessionId: session.getId().getValue() },
      })

      const checkedItems = session.getCheckedItems()
      if (checkedItems.length > 0) {
        await tx.shoppingSessionItem.createMany({
          data: checkedItems.map((item) => ({
            sessionId: session.getId().getValue(),
            ingredientId: item.getIngredientId().getValue(),
            ingredientName: item.getIngredientName().getValue(),
            stockStatus: this.mapStockStatusToPrisma(item.getStockStatus()),
            expiryStatus: item.getExpiryStatus()
              ? this.mapExpiryStatusToPrisma(item.getExpiryStatus())
              : null,
            checkedAt: item.getCheckedAt(),
            metadata: undefined,
          })),
        })
      }

      return { updatedSession, checkedItems }
    })

    // エンティティの再構築
    return this.toEntity(result.updatedSession, result.checkedItems)
  }

  /**
   * Prismaのセッションデータをエンティティに変換
   */
  private toEntity(
    prismaSession: {
      id: string
      userId: string
      status: PrismaSessionStatus
      startedAt: Date
      completedAt: Date | null
      deviceType?: PrismaDeviceType | null
      locationName?: string | null
      locationLat?: unknown
      locationLng?: unknown
    },
    checkedItems: CheckedItem[]
  ): ShoppingSession {
    // deviceTypeの変換
    let deviceType: DeviceType | null = null
    if (prismaSession.deviceType) {
      deviceType = DeviceType.fromString(prismaSession.deviceType)
    }

    // locationの変換
    let location: ShoppingLocation | null = null
    if (prismaSession.locationLat !== null && prismaSession.locationLng !== null) {
      location = ShoppingLocation.create({
        latitude: Number(prismaSession.locationLat),
        longitude: Number(prismaSession.locationLng),
        name: prismaSession.locationName || undefined,
      })
    }

    return new ShoppingSession({
      id: new ShoppingSessionId(prismaSession.id),
      userId: prismaSession.userId,
      status: this.mapPrismaSessionStatusToDomain(prismaSession.status),
      startedAt: prismaSession.startedAt,
      completedAt: prismaSession.completedAt,
      checkedItems,
      deviceType,
      location,
      isNew: false, // DBから読み込まれたエンティティは新規作成ではない
    })
  }

  /**
   * ドメインのセッションステータスをPrismaの型にマッピング
   */
  private mapSessionStatusToPrisma(status: SessionStatus): PrismaSessionStatus {
    switch (status.getValue()) {
      case 'ACTIVE':
        return 'ACTIVE'
      case 'COMPLETED':
        return 'COMPLETED'
      case 'ABANDONED':
        return 'ABANDONED'
      default:
        throw new Error(`Unknown session status: ${status.getValue()}`)
    }
  }

  /**
   * Prismaのセッションステータスをドメインの型にマッピング
   */
  private mapPrismaSessionStatusToDomain(status: PrismaSessionStatus): SessionStatus {
    switch (status) {
      case 'ACTIVE':
        return SessionStatus.ACTIVE
      case 'COMPLETED':
        return SessionStatus.COMPLETED
      case 'ABANDONED':
        return SessionStatus.ABANDONED
      default:
        throw new Error(`Unknown Prisma session status: ${status}`)
    }
  }

  /**
   * ドメインの在庫ステータスをPrismaの型にマッピング
   */
  private mapStockStatusToPrisma(status: StockStatus): PrismaStockStatus {
    switch (status.getValue()) {
      case 'IN_STOCK':
        return 'IN_STOCK'
      case 'LOW_STOCK':
        return 'LOW_STOCK'
      case 'OUT_OF_STOCK':
        return 'OUT_OF_STOCK'
      default:
        throw new Error(`Unknown stock status: ${status.getValue()}`)
    }
  }

  /**
   * Prismaの在庫ステータスをドメインの型にマッピング
   */
  private mapPrismaStockStatusToDomain(status: PrismaStockStatus): StockStatus {
    switch (status) {
      case 'IN_STOCK':
        return StockStatus.IN_STOCK
      case 'LOW_STOCK':
        return StockStatus.LOW_STOCK
      case 'OUT_OF_STOCK':
        return StockStatus.OUT_OF_STOCK
      default:
        throw new Error(`Unknown Prisma stock status: ${status}`)
    }
  }

  /**
   * ドメインの期限ステータスをPrismaの型にマッピング
   */
  private mapExpiryStatusToPrisma(status: ExpiryStatus): PrismaExpiryStatus {
    switch (status.getValue()) {
      case 'FRESH':
        return 'FRESH'
      case 'NEAR_EXPIRY':
        return 'NEAR_EXPIRY'
      case 'EXPIRING_SOON':
        return 'EXPIRING_SOON'
      case 'CRITICAL':
        return 'CRITICAL'
      case 'EXPIRED':
        return 'EXPIRED'
      default:
        throw new Error(`Unknown expiry status: ${status.getValue()}`)
    }
  }

  /**
   * Prismaの期限ステータスをドメインの型にマッピング
   */
  private mapPrismaExpiryStatusToDomain(status: PrismaExpiryStatus): ExpiryStatus {
    switch (status) {
      case 'FRESH':
        return ExpiryStatus.FRESH
      case 'NEAR_EXPIRY':
        return ExpiryStatus.NEAR_EXPIRY
      case 'EXPIRING_SOON':
        return ExpiryStatus.EXPIRING_SOON
      case 'CRITICAL':
        return ExpiryStatus.CRITICAL
      case 'EXPIRED':
        return ExpiryStatus.EXPIRED
      default:
        throw new Error(`Unknown Prisma expiry status: ${status}`)
    }
  }
}
