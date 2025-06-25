import { PrismaClient, Prisma } from '@/generated/prisma'

import { Ingredient } from '../../domain/entities/ingredient.entity'
import { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
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
        storageLocationType: ingredientStock.getStorageLocation().getType(),
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
        storageLocationType: ingredientStock.getStorageLocation().getType(),
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
    return this.toEntity(savedIngredient as any)
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

    return this.toEntity(result as any)
  }

  /**
   * 名前で食材を検索
   * @param name 食材名
   * @returns 食材（見つからない場合はnull）
   */
  async findByName(name: IngredientName): Promise<Ingredient | null> {
    const result = await this.prisma.ingredient.findFirst({
      where: {
        name: name.getValue(),
        deletedAt: null, // 論理削除されていないもののみ
      },
    })

    if (!result) {
      return null
    }

    return this.toEntity(result as any)
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

    return results.map((result) => this.toEntity(result as any))
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

    return results.map((result) => this.toEntity(result as any))
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
    quantity: number
    unitId: string
    threshold: number | null
    storageLocationType: StorageLocation
    storageLocationDetail: string | null
    bestBeforeDate: Date | null
    useByDate: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  }): Ingredient {
    // 在庫情報の構築
    const ingredientStock = new IngredientStock({
      quantity: data.quantity,
      unitId: new UnitId(data.unitId),
      storageLocation: new StorageLocation(
        data.storageLocationType as unknown as StorageType,
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
