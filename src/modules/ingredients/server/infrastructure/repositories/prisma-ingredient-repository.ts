import { PrismaClient, Prisma } from '@/generated/prisma'

import { Ingredient } from '../../domain/entities/ingredient.entity'
import { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import {
  CategoryId,
  IngredientId,
  IngredientName,
  Memo,
  Price,
  Quantity,
  StorageLocation,
  StorageType,
  UnitId,
  ExpiryInfo,
} from '../../domain/value-objects'

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
    const result = await this.prisma.ingredient.upsert({
      where: { id: ingredient.getId().getValue() },
      update: {
        name: ingredient.getName().getValue(),
        categoryId: ingredient.getCategoryId().getValue(),
        memo: ingredient.getMemo()?.getValue() || null,
        price: ingredient.getPrice() ? new Prisma.Decimal(ingredient.getPrice()!.getValue()) : null,
        purchaseDate: ingredient.getPurchaseDate(),
        quantity: new Prisma.Decimal(ingredient.getQuantity().getValue()),
        unitId: ingredient.getUnitId().getValue(),
        threshold: ingredient.getThreshold()
          ? new Prisma.Decimal(ingredient.getThreshold()!.getValue())
          : null,
        storageLocationType: ingredient.getStorageLocation().getType(),
        storageLocationDetail: ingredient.getStorageLocation().getDetail() || null,
        bestBeforeDate: ingredient.getExpiryInfo().getBestBeforeDate(),
        useByDate: ingredient.getExpiryInfo().getUseByDate(),
        updatedAt: ingredient.getUpdatedAt(),
      },
      create: {
        id: ingredient.getId().getValue(),
        userId: ingredient.getUserId(),
        name: ingredient.getName().getValue(),
        categoryId: ingredient.getCategoryId().getValue(),
        memo: ingredient.getMemo()?.getValue() || null,
        price: ingredient.getPrice() ? new Prisma.Decimal(ingredient.getPrice()!.getValue()) : null,
        purchaseDate: ingredient.getPurchaseDate(),
        quantity: new Prisma.Decimal(ingredient.getQuantity().getValue()),
        unitId: ingredient.getUnitId().getValue(),
        threshold: ingredient.getThreshold()
          ? new Prisma.Decimal(ingredient.getThreshold()!.getValue())
          : null,
        storageLocationType: ingredient.getStorageLocation().getType(),
        storageLocationDetail: ingredient.getStorageLocation().getDetail() || null,
        bestBeforeDate: ingredient.getExpiryInfo().getBestBeforeDate(),
        useByDate: ingredient.getExpiryInfo().getUseByDate(),
        createdAt: ingredient.getCreatedAt(),
        updatedAt: ingredient.getUpdatedAt(),
      },
    })

    return this.toEntity(result)
  }

  /**
   * IDで食材を検索
   * @param id 食材ID
   * @returns 食材（見つからない場合はnull）
   */
  async findById(id: IngredientId): Promise<Ingredient | null> {
    const result = await this.prisma.ingredient.findUnique({
      where: {
        id: id.getValue(),
        deletedAt: null, // 論理削除されていないもののみ
      },
    })

    if (!result) {
      return null
    }

    return this.toEntity(result)
  }

  /**
   * ユーザーIDで食材を検索
   * @param userId ユーザーID
   * @returns 食材のリスト
   */
  async findByUserId(userId: string): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        userId: userId,
        deletedAt: null, // 論理削除されていないもののみ
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 名前で食材を検索（ユーザー別）
   * @param userId ユーザーID
   * @param name 食材名
   * @returns 食材（見つからない場合はnull）
   */
  async findByUserIdAndName(userId: string, name: IngredientName): Promise<Ingredient | null> {
    const result = await this.prisma.ingredient.findFirst({
      where: {
        userId: userId,
        name: name.getValue(),
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
   * @returns 食材のリスト
   */
  async findAll(): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      where: {
        deletedAt: null, // 論理削除されていないもののみ
      },
      orderBy: { createdAt: 'desc' },
    })

    return results.map((result) => this.toEntity(result))
  }

  /**
   * 食材を削除
   * @param id 削除する食材のID
   */
  async delete(id: IngredientId): Promise<void> {
    // 論理削除の実装
    await this.prisma.ingredient.update({
      where: { id: id.getValue() },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  /**
   * Prismaの結果をエンティティに変換
   */
  private toEntity(data: {
    id: string
    userId: string
    name: string
    categoryId: string
    memo: string | null
    price: Prisma.Decimal | null
    purchaseDate: Date
    quantity: Prisma.Decimal
    unitId: string
    threshold: Prisma.Decimal | null
    storageLocationType: string
    storageLocationDetail: string | null
    bestBeforeDate: Date | null
    useByDate: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }): Ingredient {
    return new Ingredient({
      id: new IngredientId(data.id),
      userId: data.userId,
      name: new IngredientName(data.name),
      categoryId: new CategoryId(data.categoryId),
      memo: data.memo ? new Memo(data.memo) : null,
      price: data.price
        ? new Price(typeof data.price === 'object' ? data.price.toNumber() : Number(data.price))
        : null,
      purchaseDate: data.purchaseDate,
      quantity: new Quantity(
        typeof data.quantity === 'object' ? data.quantity.toNumber() : Number(data.quantity)
      ),
      unitId: new UnitId(data.unitId),
      threshold: data.threshold
        ? new Quantity(
            typeof data.threshold === 'object' ? data.threshold.toNumber() : Number(data.threshold)
          )
        : null,
      storageLocation: new StorageLocation(
        data.storageLocationType as StorageType,
        data.storageLocationDetail || undefined
      ),
      expiryInfo: new ExpiryInfo({
        bestBeforeDate: data.bestBeforeDate,
        useByDate: data.useByDate,
      }),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
    })
  }
}
