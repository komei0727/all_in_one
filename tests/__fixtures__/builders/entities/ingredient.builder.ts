import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Price,
  ExpiryInfo,
  IngredientStock,
  StorageLocation,
  StorageType,
  UnitId,
} from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers, faker } from '../faker.config'

interface IngredientProps {
  id: IngredientId
  userId: string
  name: IngredientName
  categoryId: CategoryId
  purchaseDate: Date
  ingredientStock: IngredientStock
  memo: Memo | null
  price: Price | null
  expiryInfo: ExpiryInfo | null
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
  isNew?: boolean
}

/**
 * Ingredient エンティティのテストデータビルダー
 */
export class IngredientBuilder extends BaseBuilder<IngredientProps, Ingredient> {
  constructor() {
    super()
    // デフォルト値を設定
    const defaultStock = new IngredientStock({
      quantity: faker.number.float({ min: 1, max: 10, fractionDigits: 2 }),
      unitId: new UnitId(testDataHelpers.unitId()),
      storageLocation: new StorageLocation(StorageType.REFRIGERATED),
    })

    this.props = {
      id: IngredientId.generate(),
      userId: testDataHelpers.userId(),
      name: new IngredientName(testDataHelpers.ingredientName()),
      categoryId: new CategoryId(testDataHelpers.categoryId()),
      purchaseDate: faker.date.recent({ days: 7 }),
      ingredientStock: defaultStock,
      memo: null,
      price: null,
      expiryInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      isNew: false, // デフォルトは既存エンティティとして扱う
    }
  }

  /**
   * IDを設定
   */
  withId(id: string | IngredientId): this {
    const ingredientId = typeof id === 'string' ? new IngredientId(id) : id
    return this.with('id', ingredientId)
  }

  /**
   * 新規生成されたIDを設定
   */
  withGeneratedId(): this {
    return this.with('id', IngredientId.generate())
  }

  /**
   * 食材名を設定
   */
  withName(name: string | IngredientName): this {
    const ingredientName = typeof name === 'string' ? new IngredientName(name) : name
    return this.with('name', ingredientName)
  }

  /**
   * ランダムな食材名を設定
   */
  withRandomName(): this {
    return this.with('name', new IngredientName(testDataHelpers.ingredientName()))
  }

  /**
   * カテゴリーIDを設定
   */
  withCategoryId(categoryId: string | CategoryId): this {
    const id = typeof categoryId === 'string' ? new CategoryId(categoryId) : categoryId
    return this.with('categoryId', id)
  }

  /**
   * メモを設定
   */
  withMemo(memo: string | Memo | null): this {
    const memoVo = typeof memo === 'string' ? new Memo(memo) : memo
    return this.with('memo', memoVo)
  }

  /**
   * メモなしを設定
   */
  withoutMemo(): this {
    return this.with('memo', null)
  }

  /**
   * ランダムなメモを設定
   */
  withRandomMemo(): this {
    return this.with('memo', new Memo(faker.lorem.sentence()))
  }

  /**
   * ユーザーIDを設定
   */
  withUserId(userId: string): this {
    return this.with('userId', userId)
  }

  /**
   * 購入日を設定
   */
  withPurchaseDate(date: Date): this {
    return this.with('purchaseDate', date)
  }

  /**
   * 価格を設定
   */
  withPrice(price: number | Price | null): this {
    const priceVo = typeof price === 'number' ? new Price(price) : price
    return this.with('price', priceVo)
  }

  /**
   * 価格なしを設定
   */
  withoutPrice(): this {
    return this.with('price', null)
  }

  /**
   * 期限情報を設定
   */
  withExpiryInfo(
    expiryInfo: { bestBeforeDate?: Date | null; useByDate?: Date | null } | ExpiryInfo | null
  ): this {
    if (!expiryInfo) {
      return this.with('expiryInfo', null)
    }

    if (expiryInfo instanceof ExpiryInfo) {
      return this.with('expiryInfo', expiryInfo)
    }

    // オブジェクトの場合はExpiryInfoに変換
    const newExpiryInfo = new ExpiryInfo({
      bestBeforeDate: expiryInfo.bestBeforeDate || null,
      useByDate: expiryInfo.useByDate || null,
    })
    return this.with('expiryInfo', newExpiryInfo)
  }

  /**
   * 期限情報なしを設定
   */
  withoutExpiryInfo(): this {
    return this.with('expiryInfo', null)
  }

  /**
   * 今日を購入日として設定
   */
  withPurchasedToday(): this {
    return this.with('purchaseDate', new Date())
  }

  /**
   * 冷蔵保存の在庫を設定
   */
  withRefrigeratedStock(quantity: number, unitId: string, detail?: string): this {
    const stock = new IngredientStock({
      quantity,
      unitId: new UnitId(unitId),
      storageLocation: new StorageLocation(StorageType.REFRIGERATED, detail),
    })
    return this.with('ingredientStock', stock)
  }

  /**
   * 将来の賞味期限を設定
   */
  withFutureBestBeforeDate(daysFromNow: number): this {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysFromNow)
    const expiryInfo = new ExpiryInfo({
      bestBeforeDate: futureDate,
      useByDate: this.props.expiryInfo?.getUseByDate() || null,
    })
    return this.with('expiryInfo', expiryInfo)
  }

  /**
   * 在庫情報を設定
   */
  withIngredientStock(stock: IngredientStock | any): this {
    // IngredientStockインスタンスでない場合は作成
    if (!(stock instanceof IngredientStock)) {
      const ingredientStock = new IngredientStock({
        quantity: stock.quantity,
        unitId: stock.unitId instanceof UnitId ? stock.unitId : new UnitId(stock.unitId.getValue()),
        storageLocation: stock.storageLocation,
        threshold: stock.threshold,
      })
      return this.with('ingredientStock', ingredientStock)
    }
    return this.with('ingredientStock', stock)
  }

  /**
   * デフォルトの在庫情報を設定
   */
  withDefaultStock(): this {
    const stock = new IngredientStock({
      quantity: faker.number.float({ min: 1, max: 10, fractionDigits: 2 }),
      unitId: new UnitId(testDataHelpers.unitId()),
      storageLocation: new StorageLocation(StorageType.REFRIGERATED),
    })
    return this.with('ingredientStock', stock)
  }

  /**
   * 期限切れの食材を設定
   */
  withExpiredExpiryInfo(): this {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - faker.number.int({ min: 1, max: 30 }))
    const expiryInfo = new ExpiryInfo({
      bestBeforeDate: pastDate,
      useByDate: null,
    })
    return this.with('expiryInfo', expiryInfo)
  }

  /**
   * 在庫0の状態を設定
   */
  withEmptyStock(): this {
    const stock = new IngredientStock({
      quantity: 0,
      unitId: new UnitId(testDataHelpers.unitId()),
      storageLocation: new StorageLocation(StorageType.REFRIGERATED),
    })
    return this.with('ingredientStock', stock)
  }

  /**
   * 在庫数量を設定（既存の単位とストレージ情報を保持）
   */
  withQuantity(quantity: number): this {
    const currentStock = this.props.ingredientStock
    if (!currentStock) {
      throw new Error('ingredientStock must be set before calling withQuantity')
    }
    const stock = new IngredientStock({
      quantity,
      unitId: currentStock.getUnitId(),
      storageLocation: currentStock.getStorageLocation(),
      threshold: currentStock.getThreshold(),
    })
    return this.with('ingredientStock', stock)
  }

  /**
   * 新規作成フラグを設定
   */
  withIsNew(isNew: boolean): this {
    return this.with('isNew', isNew)
  }

  /**
   * 削除日時を設定
   */
  withDeletedAt(deletedAt: Date | null): this {
    return this.with('deletedAt', deletedAt)
  }

  build(): Ingredient {
    return new Ingredient(this.props as IngredientProps)
  }
}

export const anIngredient = () => new IngredientBuilder()
