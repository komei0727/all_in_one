import { Ingredient } from '../entities/ingredient.entity'
import { DuplicateIngredientException } from '../exceptions'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  UnitId,
  IngredientStock,
  StorageLocation,
  Memo,
  Price,
  ExpiryInfo,
  type StorageType,
} from '../value-objects'

import type { IngredientRepository } from '../repositories/ingredient-repository.interface'

/**
 * 食材ファクトリ
 * 食材の生成とビジネスルールの検証を担当
 */
export class IngredientFactory {
  constructor(private readonly repository: IngredientRepository) {}

  /**
   * 新しい食材を作成
   * @param params 食材作成パラメータ
   * @returns 作成された食材
   * @throws {DuplicateIngredientException} 同じ名前・期限・保存場所の食材が既に存在する場合
   */
  async create(params: {
    userId: string
    name: string
    categoryId: string
    unitId: string
    quantity: number
    purchaseDate: Date
    storageLocation: { type: StorageType; detail?: string }
    threshold?: number | null
    memo?: string | null
    price?: number | null
    expiryInfo?: { bestBeforeDate: Date; useByDate?: Date | null } | null
  }): Promise<Ingredient> {
    // 重複チェック（同じユーザー内で同じ名前・期限・保存場所の組み合わせ）
    const duplicates = await this.repository.findDuplicates({
      userId: params.userId,
      name: params.name,
      expiryInfo: params.expiryInfo ?? null,
      storageLocation: params.storageLocation,
    })

    if (duplicates.length > 0) {
      throw new DuplicateIngredientException(
        params.name,
        params.expiryInfo ?? null,
        params.storageLocation
      )
    }

    // 食材を作成
    const id = IngredientId.generate()
    const ingredientName = new IngredientName(params.name)
    const categoryId = new CategoryId(params.categoryId)
    const unitId = new UnitId(params.unitId)
    const ingredientStock = new IngredientStock({
      quantity: params.quantity,
      unitId,
      storageLocation: new StorageLocation(
        params.storageLocation.type,
        params.storageLocation.detail
      ),
      threshold: params.threshold,
    })

    const ingredient = new Ingredient({
      id,
      userId: params.userId,
      name: ingredientName,
      categoryId,
      purchaseDate: params.purchaseDate,
      ingredientStock,
      memo: params.memo ? new Memo(params.memo) : null,
      price: params.price ? new Price(params.price) : null,
      expiryInfo: params.expiryInfo
        ? new ExpiryInfo({
            bestBeforeDate: params.expiryInfo.bestBeforeDate,
            useByDate: params.expiryInfo.useByDate || null,
          })
        : null,
      isNew: true, // 新規作成フラグを設定
    })

    return ingredient
  }

  /**
   * 重複チェックを行って食材を作成（createのエイリアス）
   * @param params 食材作成パラメータ
   * @returns 作成された食材
   */
  async createWithCheck(params: {
    userId: string
    name: string
    categoryId: string
    unitId: string
    quantity: number
    purchaseDate: Date
    storageLocation: { type: StorageType; detail?: string }
    threshold?: number | null
    memo?: string | null
    price?: number | null
    expiryInfo?: { bestBeforeDate: Date; useByDate?: Date | null } | null
  }): Promise<Ingredient> {
    return this.create(params)
  }
}
