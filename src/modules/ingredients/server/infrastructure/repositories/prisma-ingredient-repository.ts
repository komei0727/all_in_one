import {
  type PrismaClient,
  Prisma,
  type StorageLocation as PrismaStorageLocation,
  type Ingredient as PrismaIngredient,
} from '@/generated/prisma'

import { Ingredient } from '../../domain/entities/ingredient.entity'
import {
  CategoryId,
  IngredientId,
  IngredientName,
  Memo,
  Price,
  StorageLocation,
  StorageType,
  UnitId,
  ExpiryInfo,
  IngredientStock,
} from '../../domain/value-objects'

import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'

/**
 * Prismaを使用した食材リポジトリの実装
 */
export class PrismaIngredientRepository implements IngredientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 食材を保存
   * @param ingredient 保存する食材
   * @returns 保存された食材
   */
  async save(ingredient: Ingredient): Promise<Ingredient> {
    const ingredientStock = ingredient.getIngredientStock()
    const expiryInfo = ingredient.getExpiryInfo()

    // 食材の保存
    const savedIngredient = await this.prisma.ingredient.upsert({
      where: { id: ingredient.getId().getValue() },
      update: {
        userId: ingredient.getUserId(),
        name: ingredient.getName().getValue(),
        categoryId: ingredient.getCategoryId().getValue(),
        memo: ingredient.getMemo()?.getValue() || null,
        price: ingredient.getPrice() ? new Prisma.Decimal(ingredient.getPrice()!.getValue()) : null,
        purchaseDate: ingredient.getPurchaseDate(),
        // 在庫情報
        quantity: ingredientStock.getQuantity(),
        unitId: ingredientStock.getUnitId().getValue(),
        threshold: ingredientStock.getThreshold(),
        // 保存場所
        storageLocationType: this.mapStorageTypeToPrismaStorageLocation(
          ingredientStock.getStorageLocation().getType()
        ),
        storageLocationDetail: ingredientStock.getStorageLocation().getDetail() || null,
        // 期限情報
        bestBeforeDate: expiryInfo?.getBestBeforeDate() || null,
        useByDate: expiryInfo?.getUseByDate() || null,
        updatedAt: ingredient.getUpdatedAt(),
        deletedAt: ingredient.getDeletedAt(),
      },
      create: {
        id: ingredient.getId().getValue(),
        userId: ingredient.getUserId(),
        name: ingredient.getName().getValue(),
        categoryId: ingredient.getCategoryId().getValue(),
        memo: ingredient.getMemo()?.getValue() || null,
        price: ingredient.getPrice() ? new Prisma.Decimal(ingredient.getPrice()!.getValue()) : null,
        purchaseDate: ingredient.getPurchaseDate(),
        // 在庫情報
        quantity: ingredientStock.getQuantity(),
        unitId: ingredientStock.getUnitId().getValue(),
        threshold: ingredientStock.getThreshold(),
        // 保存場所
        storageLocationType: this.mapStorageTypeToPrismaStorageLocation(
          ingredientStock.getStorageLocation().getType()
        ),
        storageLocationDetail: ingredientStock.getStorageLocation().getDetail() || null,
        // 期限情報
        bestBeforeDate: expiryInfo?.getBestBeforeDate() || null,
        useByDate: expiryInfo?.getUseByDate() || null,
        createdAt: ingredient.getCreatedAt(),
        updatedAt: ingredient.getUpdatedAt(),
        deletedAt: ingredient.getDeletedAt(),
      },
    })

    // エンティティの再構築
    return this.toEntity(savedIngredient)
  }

  /**
   * IDで食材を検索
   * @param userId ユーザーID
   * @param id 食材ID
   * @returns 食材（見つからない場合はnull）
   */
  async findById(userId: string, id: IngredientId): Promise<Ingredient | null> {
    const result = await this.prisma.ingredient.findFirst({
      where: {
        id: id.getValue(),
        userId,
        deletedAt: null, // 論理削除されていないもののみ
      },
    })

    if (!result) {
      return null
    }

    return this.toEntity(result)
  }

  /**
   * 名前で食材を検索
   * @param userId ユーザーID
   * @param name 食材名
   * @returns 食材（見つからない場合はnull）
   */
  async findByName(userId: string, name: IngredientName): Promise<Ingredient | null> {
    const result = await this.prisma.ingredient.findFirst({
      where: {
        name: name.getValue(),
        userId,
        deletedAt: null, // 論理削除されていないもののみ
      },
    })

    if (!result) {
      return null
    }

    return this.toEntity(result)
  }

  /**
   * すべての食材を取得
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  async findAll(userId: string): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        deletedAt: null, // 論理削除されていないもののみ
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 食材を削除
   * @param userId ユーザーID
   * @param id 削除する食材のID
   */
  async delete(userId: string, id: IngredientId): Promise<void> {
    // 論理削除の実装
    // まずユーザーが所有する食材か確認
    const ingredient = await this.findById(userId, id)
    if (!ingredient) {
      // ユーザーが所有しない食材は削除できない
      return
    }

    await this.prisma.ingredient.update({
      where: { id: id.getValue() },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  /**
   * ユーザーIDで食材を検索
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  async findByUserId(userId: string): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        deletedAt: null, // 論理削除されていないもののみ
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 期限切れ間近の食材を検索
   * @param userId ユーザーID
   * @param days 期限切れまでの日数
   * @returns 食材のリスト
   */
  async findExpiringSoon(userId: string, days: number): Promise<Ingredient[]> {
    // 今日の開始時刻（00:00:00）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 指定日数後の終了時刻（23:59:59）
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + days)
    expiryDate.setHours(23, 59, 59, 999)

    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          {
            bestBeforeDate: {
              lte: expiryDate,
              gte: today,
            },
          },
          {
            useByDate: {
              lte: expiryDate,
              gte: today,
            },
          },
        ],
      },
      orderBy: [{ useByDate: 'asc' }, { bestBeforeDate: 'asc' }, { createdAt: 'desc' }],
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 期限切れの食材を検索
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  async findExpired(userId: string): Promise<Ingredient[]> {
    // 今日の開始時刻（00:00:00）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          {
            bestBeforeDate: {
              lt: today,
            },
          },
          {
            useByDate: {
              lt: today,
            },
          },
        ],
      },
      orderBy: [{ useByDate: 'asc' }, { bestBeforeDate: 'asc' }, { createdAt: 'desc' }],
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * カテゴリーで食材を検索
   * @param userId ユーザーID
   * @param categoryId カテゴリーID
   * @returns 食材のリスト
   */
  async findByCategory(userId: string, categoryId: string): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        categoryId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 保存場所で食材を検索
   * @param userId ユーザーID
   * @param location 保存場所
   * @returns 食材のリスト
   */
  async findByStorageLocation(userId: string, location: StorageType): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        storageLocationType: this.mapStorageTypeToPrismaStorageLocation(location),
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 在庫切れの食材を検索
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  async findOutOfStock(userId: string): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        quantity: 0,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 在庫不足の食材を検索
   * @param userId ユーザーID
   * @param threshold 閾値（省略時はthresholdの値を使用）
   * @returns 食材のリスト
   */
  async findLowStock(userId: string, threshold?: number): Promise<Ingredient[]> {
    // thresholdが指定されている場合は、その値以下の在庫を検索
    if (threshold !== undefined) {
      const results = await this.prisma.ingredient.findMany({
        where: {
          userId,
          quantity: {
            lte: threshold,
            gt: 0, // 在庫切れは除外
          },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      return results.map((result) => this.toEntity(result))
    }

    // thresholdが指定されていない場合は、各食材のthreshold値を使用
    const results = await this.prisma.ingredient.findMany({
      where: {
        userId,
        deletedAt: null,
        // Prismaの制約で、フィールド同士の比較は直接できないため、
        // 全て取得してからフィルタリングする
        threshold: {
          not: null, // thresholdが設定されているもののみ
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // フィルタリング: quantity <= threshold かつ quantity > 0
    const filteredResults = results.filter(
      (result) =>
        result.threshold !== null && result.quantity <= result.threshold && result.quantity > 0
    )

    return filteredResults.map((result) => this.toEntity(result))
  }

  /**
   * 重複チェック（同じユーザー、名前、期限情報、保存場所）
   * @param userId ユーザーID
   * @param name 食材名
   * @param expiryInfo 期限情報
   * @param location 保存場所
   * @returns 存在する場合はtrue
   */
  async existsByUserAndNameAndExpiryAndLocation(
    userId: string,
    name: IngredientName,
    expiryInfo: ExpiryInfo | null,
    location: StorageLocation
  ): Promise<boolean> {
    const where: Prisma.IngredientWhereInput = {
      userId,
      name: name.getValue(),
      storageLocationType: this.mapStorageTypeToPrismaStorageLocation(location.getType()),
      storageLocationDetail: location.getDetail() || null,
      deletedAt: null,
    }

    // 期限情報がある場合の条件設定
    if (expiryInfo) {
      where.bestBeforeDate = expiryInfo.getBestBeforeDate() || null
      where.useByDate = expiryInfo.getUseByDate() || null
    } else {
      // 期限情報がない場合は、両方nullの条件
      where.bestBeforeDate = null
      where.useByDate = null
    }

    const count = await this.prisma.ingredient.count({ where })

    return count > 0
  }

  /**
   * 条件付きで食材を検索
   * @param criteria 検索条件
   * @returns 食材のリスト
   */
  async findMany(criteria: {
    userId?: string
    page: number
    limit: number
    search?: string
    categoryId?: string
    expiryStatus?: 'all' | 'expired' | 'expiring' | 'fresh'
    sortBy?: 'name' | 'purchaseDate' | 'expiryDate' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Ingredient[]> {
    const where: Prisma.IngredientWhereInput = {
      deletedAt: null,
    }

    // ユーザーIDフィルター
    if (criteria.userId) {
      where.userId = criteria.userId
    }

    // 検索条件
    if (criteria.search) {
      where.name = {
        contains: criteria.search,
        mode: 'insensitive',
      }
    }

    // カテゴリーフィルター
    if (criteria.categoryId) {
      where.categoryId = criteria.categoryId
    }

    // 期限状態フィルター
    if (criteria.expiryStatus && criteria.expiryStatus !== 'all') {
      const now = new Date()
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      switch (criteria.expiryStatus) {
        case 'expired':
          where.OR = [{ bestBeforeDate: { lt: now } }, { useByDate: { lt: now } }]
          break
        case 'expiring':
          where.OR = [
            {
              bestBeforeDate: {
                gte: now,
                lte: threeDaysFromNow,
              },
            },
            {
              useByDate: {
                gte: now,
                lte: threeDaysFromNow,
              },
            },
          ]
          break
        case 'fresh':
          where.AND = [
            {
              OR: [{ bestBeforeDate: { gt: threeDaysFromNow } }, { bestBeforeDate: null }],
            },
            {
              OR: [{ useByDate: { gt: threeDaysFromNow } }, { useByDate: null }],
            },
          ]
          break
      }
    }

    // ソート設定
    const orderBy: Prisma.IngredientOrderByWithRelationInput = {}
    switch (criteria.sortBy) {
      case 'name':
        orderBy.name = criteria.sortOrder || 'asc'
        break
      case 'purchaseDate':
        orderBy.purchaseDate = criteria.sortOrder || 'desc'
        break
      case 'expiryDate':
        // 賞味期限でソート（nullは最後）
        orderBy.bestBeforeDate = criteria.sortOrder || 'asc'
        break
      case 'createdAt':
      default:
        orderBy.createdAt = criteria.sortOrder || 'desc'
        break
    }

    // ページネーション
    const skip = (criteria.page - 1) * criteria.limit

    const results = await this.prisma.ingredient.findMany({
      where,
      orderBy,
      skip,
      take: criteria.limit,
      include: {
        category: true,
        unit: true,
      },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 条件に一致する食材の総数を取得
   * @param criteria カウント条件
   * @returns 食材の総数
   */
  async count(criteria: {
    userId?: string
    search?: string
    categoryId?: string
    expiryStatus?: 'all' | 'expired' | 'expiring' | 'fresh'
  }): Promise<number> {
    const where: Prisma.IngredientWhereInput = {
      deletedAt: null,
    }

    // ユーザーIDフィルター
    if (criteria.userId) {
      where.userId = criteria.userId
    }

    // 検索条件
    if (criteria.search) {
      where.name = {
        contains: criteria.search,
        mode: 'insensitive',
      }
    }

    // カテゴリーフィルター
    if (criteria.categoryId) {
      where.categoryId = criteria.categoryId
    }

    // 期限状態フィルター（findManyと同じロジック）
    if (criteria.expiryStatus && criteria.expiryStatus !== 'all') {
      const now = new Date()
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      switch (criteria.expiryStatus) {
        case 'expired':
          where.OR = [{ bestBeforeDate: { lt: now } }, { useByDate: { lt: now } }]
          break
        case 'expiring':
          where.OR = [
            {
              bestBeforeDate: {
                gte: now,
                lte: threeDaysFromNow,
              },
            },
            {
              useByDate: {
                gte: now,
                lte: threeDaysFromNow,
              },
            },
          ]
          break
        case 'fresh':
          where.AND = [
            {
              OR: [{ bestBeforeDate: { gt: threeDaysFromNow } }, { bestBeforeDate: null }],
            },
            {
              OR: [{ useByDate: { gt: threeDaysFromNow } }, { useByDate: null }],
            },
          ]
          break
      }
    }

    return await this.prisma.ingredient.count({ where })
  }

  /**
   * PrismaのStorageLocationをドメインのStorageTypeに変換
   */
  private mapPrismaStorageLocationToStorageType(
    prismaLocation: PrismaStorageLocation
  ): StorageType {
    switch (prismaLocation) {
      case 'REFRIGERATED':
        return StorageType.REFRIGERATED
      case 'FROZEN':
        return StorageType.FROZEN
      case 'ROOM_TEMPERATURE':
        return StorageType.ROOM_TEMPERATURE
      default:
        throw new Error(`Unknown storage location type: ${prismaLocation}`)
    }
  }

  /**
   * ドメインのStorageTypeをPrismaのStorageLocationに変換
   */
  private mapStorageTypeToPrismaStorageLocation(storageType: StorageType): PrismaStorageLocation {
    switch (storageType) {
      case StorageType.REFRIGERATED:
        return 'REFRIGERATED'
      case StorageType.FROZEN:
        return 'FROZEN'
      case StorageType.ROOM_TEMPERATURE:
        return 'ROOM_TEMPERATURE'
      default:
        throw new Error(`Unknown storage type: ${storageType}`)
    }
  }

  /**
   * 重複する食材を検索
   * @param criteria 重複チェック条件
   * @returns 重複する食材のリスト
   */
  async findDuplicates(criteria: {
    userId: string
    name: string
    expiryInfo: { bestBeforeDate: Date; useByDate?: Date | null } | null
    storageLocation: { type: StorageType; detail?: string }
  }): Promise<Ingredient[]> {
    const where: Prisma.IngredientWhereInput = {
      userId: criteria.userId,
      name: criteria.name,
      storageLocationType: this.mapStorageTypeToPrismaStorageLocation(
        criteria.storageLocation.type
      ),
      storageLocationDetail: criteria.storageLocation.detail || null,
      deletedAt: null,
    }

    // 期限情報の条件
    if (criteria.expiryInfo) {
      where.bestBeforeDate = criteria.expiryInfo.bestBeforeDate
      where.useByDate = criteria.expiryInfo.useByDate || null
    } else {
      where.bestBeforeDate = null
      where.useByDate = null
    }

    const results = await this.prisma.ingredient.findMany({
      where,
      include: {
        category: true,
        unit: true,
      },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 食材を更新
   * @param ingredient 更新する食材
   * @returns 更新された食材
   */
  async update(ingredient: Ingredient): Promise<Ingredient> {
    const ingredientStock = ingredient.getIngredientStock()
    const expiryInfo = ingredient.getExpiryInfo()

    const updatedIngredient = await this.prisma.ingredient.update({
      where: { id: ingredient.getId().getValue() },
      data: {
        userId: ingredient.getUserId(),
        name: ingredient.getName().getValue(),
        categoryId: ingredient.getCategoryId().getValue(),
        memo: ingredient.getMemo()?.getValue() || null,
        price: ingredient.getPrice() ? new Prisma.Decimal(ingredient.getPrice()!.getValue()) : null,
        purchaseDate: ingredient.getPurchaseDate(),
        // 在庫情報
        quantity: ingredientStock.getQuantity(),
        unitId: ingredientStock.getUnitId().getValue(),
        storageLocationType: this.mapStorageTypeToPrismaStorageLocation(
          ingredientStock.getStorageLocation().getType()
        ),
        storageLocationDetail: ingredientStock.getStorageLocation().getDetail() || null,
        threshold: ingredientStock.getThreshold(),
        // 期限情報
        bestBeforeDate: expiryInfo?.getBestBeforeDate() || null,
        useByDate: expiryInfo?.getUseByDate() || null,
        // タイムスタンプ
        updatedAt: ingredient.getUpdatedAt(),
        deletedAt: ingredient.getDeletedAt(),
      },
      include: {
        category: true,
        unit: true,
      },
    })

    return this.toEntity(updatedIngredient)
  }

  /**
   * Prismaの結果をエンティティに変換
   */
  private toEntity(data: PrismaIngredient): Ingredient {
    // 在庫情報の構築
    const ingredientStock = new IngredientStock({
      quantity: data.quantity,
      unitId: new UnitId(data.unitId),
      storageLocation: new StorageLocation(
        this.mapPrismaStorageLocationToStorageType(data.storageLocationType),
        data.storageLocationDetail || undefined
      ),
      threshold: data.threshold,
    })

    // 期限情報の構築
    const expiryInfo =
      data.bestBeforeDate || data.useByDate
        ? new ExpiryInfo({
            bestBeforeDate: data.bestBeforeDate,
            useByDate: data.useByDate,
          })
        : null

    // 食材エンティティの構築
    return new Ingredient({
      id: new IngredientId(data.id),
      userId: data.userId,
      name: new IngredientName(data.name),
      categoryId: new CategoryId(data.categoryId),
      purchaseDate: data.purchaseDate,
      ingredientStock,
      memo: data.memo ? new Memo(data.memo) : null,
      price: data.price !== null ? new Price(data.price.toNumber()) : null,
      expiryInfo,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
    })
  }
}
