import { CreateIngredientCommand } from '@/modules/ingredients/server/application/commands/create-ingredient.command'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers, faker } from '../faker.config'

interface CreateIngredientCommandProps {
  userId: string
  name: string
  categoryId: string
  quantity: {
    amount: number
    unitId: string
  }
  storageLocation: {
    type: StorageType
    detail?: string
  }
  threshold?: number
  expiryInfo?: {
    bestBeforeDate?: string | null
    useByDate?: string | null
  } | null
  purchaseDate: string
  price?: number
  memo?: string
}

/**
 * CreateIngredientCommand のテストデータビルダー
 */
export class CreateIngredientCommandBuilder extends BaseBuilder<
  CreateIngredientCommandProps,
  CreateIngredientCommand
> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      userId: testDataHelpers.cuid(),
      name: testDataHelpers.ingredientName(),
      categoryId: testDataHelpers.cuid(),
      quantity: {
        amount: testDataHelpers.quantity(),
        unitId: testDataHelpers.cuid(),
      },
      storageLocation: {
        type: StorageType.REFRIGERATED,
        detail: undefined,
      },
      threshold: undefined,
      purchaseDate: testDataHelpers.todayString(),
      price: undefined,
      memo: undefined,
    }
  }

  /**
   * 食材名を設定
   */
  withName(name: string): this {
    return this.with('name', name)
  }

  /**
   * ランダムな食材名を設定
   */
  withRandomName(): this {
    return this.with('name', testDataHelpers.ingredientName())
  }

  /**
   * カテゴリーIDを設定
   */
  withCategoryId(categoryId: string): this {
    return this.with('categoryId', categoryId)
  }

  /**
   * メモを設定
   */
  withMemo(memo?: string): this {
    return this.with('memo', memo)
  }

  /**
   * ランダムなメモを設定
   */
  withRandomMemo(): this {
    return this.with('memo', faker.lorem.sentence())
  }

  /**
   * 数量を設定
   */
  withQuantity(amount: number, unitId: string): this {
    return this.with('quantity', { amount, unitId })
  }

  /**
   * 保存場所を設定
   */
  withStorageLocation(storageLocation: { type: StorageType | string; detail?: string }): this {
    return this.with('storageLocation', storageLocation as { type: StorageType; detail?: string })
  }

  /**
   * 期限情報を設定
   */
  withExpiryInfo(
    expiryInfo?: { bestBeforeDate?: string | null; useByDate?: string | null } | null
  ): this {
    return this.with('expiryInfo', expiryInfo)
  }

  /**
   * 賞味期限を設定
   */
  withBestBeforeDate(date: string | null): this {
    const current = this.props.expiryInfo || {}
    return this.with('expiryInfo', {
      ...current,
      bestBeforeDate: date,
    })
  }

  /**
   * 消費期限を設定
   */
  withUseByDate(date: string | null): this {
    const current = this.props.expiryInfo || {}
    return this.with('expiryInfo', {
      ...current,
      useByDate: date,
    })
  }

  /**
   * 購入日を設定
   */
  withPurchaseDate(date: string): this {
    return this.with('purchaseDate', date)
  }

  /**
   * 価格を設定
   */
  withPrice(price?: number): this {
    return this.with('price', price)
  }

  /**
   * ユーザーIDを設定
   */
  withUserId(userId: string): this {
    return this.with('userId', userId)
  }

  /**
   * 閾値を設定
   */
  withThreshold(threshold?: number): this {
    return this.with('threshold', threshold)
  }

  /**
   * デフォルトの在庫情報を設定
   */
  withDefaultStock(): this {
    return this.withQuantity(testDataHelpers.quantity(), testDataHelpers.cuid())
      .withStorageLocation({ type: StorageType.REFRIGERATED })
      .withPurchaseDate(testDataHelpers.todayString())
      .withPrice(testDataHelpers.price())
      .withBestBeforeDate(testDataHelpers.dateStringFromNow(7))
  }

  /**
   * 冷蔵庫保存の在庫を設定
   */
  withRefrigeratedStock(): this {
    return this.withQuantity(testDataHelpers.quantity(), testDataHelpers.cuid())
      .withStorageLocation({ type: StorageType.REFRIGERATED, detail: '野菜室' })
      .withPurchaseDate(testDataHelpers.todayString())
      .withPrice(testDataHelpers.price())
      .withBestBeforeDate(testDataHelpers.dateStringFromNow(7))
  }

  /**
   * 冷凍庫保存の在庫を設定
   */
  withFrozenStock(): this {
    return this.withQuantity(testDataHelpers.quantity(), testDataHelpers.cuid())
      .withStorageLocation({ type: StorageType.FROZEN })
      .withPurchaseDate(testDataHelpers.todayString())
      .withPrice(testDataHelpers.price())
      .withUseByDate(testDataHelpers.dateStringFromNow(30))
  }

  /**
   * 常温保存の在庫を設定
   */
  withRoomTemperatureStock(): this {
    return this.withQuantity(testDataHelpers.quantity(), testDataHelpers.cuid())
      .withStorageLocation({ type: StorageType.ROOM_TEMPERATURE, detail: 'パントリー' })
      .withPurchaseDate(testDataHelpers.todayString())
      .withPrice(testDataHelpers.price())
      .withBestBeforeDate(testDataHelpers.dateStringFromNow(90))
  }

  /**
   * 全ての項目を含むデータを設定
   */
  withFullData(): this {
    return this.withQuantity(testDataHelpers.quantity(), testDataHelpers.cuid())
      .withStorageLocation({ type: StorageType.REFRIGERATED, detail: '野菜室' })
      .withPurchaseDate(testDataHelpers.todayString())
      .withPrice(testDataHelpers.price())
      .withExpiryInfo({
        bestBeforeDate: testDataHelpers.dateStringFromNow(7),
        useByDate: testDataHelpers.dateStringFromNow(4),
      })
      .withRandomMemo()
  }

  build(): CreateIngredientCommand {
    return new CreateIngredientCommand(this.props as CreateIngredientCommandProps)
  }
}
