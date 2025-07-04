import type { StorageType } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers, faker } from '../faker.config'

interface UpdateIngredientCommandProps {
  id: string
  userId: string
  name?: string
  categoryId?: string
  memo?: string | null
  price?: number | null
  purchaseDate?: string
  expiryInfo?: {
    bestBeforeDate: string | null
    useByDate: string | null
  } | null
  stock?: {
    quantity: number
    unitId: string
    storageLocation: {
      type: 'ROOM_TEMPERATURE' | 'REFRIGERATED' | 'FROZEN'
      detail: string | null
    }
    threshold: number | null
  }
}

/**
 * UpdateIngredientCommand のテストデータビルダー
 */
export class UpdateIngredientCommandBuilder extends BaseBuilder<UpdateIngredientCommandProps, any> {
  constructor() {
    super()
    // デフォルト値を設定（更新コマンドなのでオプショナルな値のみ）
    this.props = {
      id: testDataHelpers.ingredientId(),
      userId: testDataHelpers.userId(),
    }
  }

  /**
   * 食材IDを設定
   */
  withId(id: string): this {
    return this.with('id', id)
  }

  /**
   * ユーザーIDを設定
   */
  withUserId(userId: string): this {
    return this.with('userId', userId)
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
  withMemo(memo: string | null): this {
    return this.with('memo', memo)
  }

  /**
   * ランダムなメモを設定
   */
  withRandomMemo(): this {
    return this.with('memo', faker.lorem.sentence())
  }

  /**
   * 価格を設定
   */
  withPrice(price: number | null): this {
    return this.with('price', price)
  }

  /**
   * 購入日を設定
   */
  withPurchaseDate(date: string): this {
    return this.with('purchaseDate', date)
  }

  /**
   * 期限情報を設定
   */
  withExpiryInfo(
    expiryInfo: { bestBeforeDate: string | null; useByDate: string | null } | null
  ): this {
    return this.with('expiryInfo', expiryInfo)
  }

  /**
   * 賞味期限を設定
   */
  withBestBeforeDate(date: string | null): this {
    const current = this.props.expiryInfo || { bestBeforeDate: null, useByDate: null }
    return this.with('expiryInfo', {
      ...current,
      bestBeforeDate: date,
    })
  }

  /**
   * 消費期限を設定
   */
  withUseByDate(date: string | null): this {
    const current = this.props.expiryInfo || { bestBeforeDate: null, useByDate: null }
    return this.with('expiryInfo', {
      ...current,
      useByDate: date,
    })
  }

  /**
   * 在庫情報を設定
   */
  withStock(stock: {
    quantity: number
    unitId: string
    storageLocation: {
      type: 'ROOM_TEMPERATURE' | 'REFRIGERATED' | 'FROZEN'
      detail: string | null
    }
    threshold: number | null
  }): this {
    return this.with('stock', stock)
  }

  /**
   * 数量・単位を設定
   */
  withQuantityAndUnit(quantity: number, unitId: string): this {
    const currentStock = this.props.stock || {
      quantity: 0,
      unitId: testDataHelpers.unitId(),
      storageLocation: {
        type: 'REFRIGERATED' as const,
        detail: null,
      },
      threshold: null,
    }

    return this.with('stock', {
      ...currentStock,
      quantity,
      unitId,
    })
  }

  /**
   * 保存場所を設定
   */
  withStorageLocation(storageLocation: {
    type: StorageType | string
    detail?: string | null
  }): this {
    const currentStock = this.props.stock || {
      quantity: testDataHelpers.quantity(),
      unitId: testDataHelpers.unitId(),
      storageLocation: {
        type: 'REFRIGERATED' as const,
        detail: null,
      },
      threshold: null,
    }

    return this.with('stock', {
      ...currentStock,
      storageLocation: {
        type: storageLocation.type as 'ROOM_TEMPERATURE' | 'REFRIGERATED' | 'FROZEN',
        detail: storageLocation.detail ?? null,
      },
    })
  }

  /**
   * 閾値を設定
   */
  withThreshold(threshold: number | null): this {
    const currentStock = this.props.stock || {
      quantity: testDataHelpers.quantity(),
      unitId: testDataHelpers.unitId(),
      storageLocation: {
        type: 'REFRIGERATED' as const,
        detail: null,
      },
      threshold: null,
    }

    return this.with('stock', {
      ...currentStock,
      threshold,
    })
  }

  /**
   * 保存場所のみの更新（他のstock情報を変更しない）
   */
  withStorageLocationOnly(storageLocation: {
    type: StorageType | string
    detail?: string | null
  }): this {
    // 既存のstockがあればそれを使用、なければstorageLocationのみ設定
    if (this.props.stock) {
      return this.with('stock', {
        ...this.props.stock,
        storageLocation: {
          type: storageLocation.type as 'ROOM_TEMPERATURE' | 'REFRIGERATED' | 'FROZEN',
          detail: storageLocation.detail ?? null,
        },
      })
    }
    // stockがない場合は何も設定しない（部分更新なので問題ない）
    return this
  }

  /**
   * 名前のみの更新
   */
  withNameOnly(name: string): this {
    return this.withName(name)
  }

  /**
   * 価格のみの更新
   */
  withPriceOnly(price: number | null): this {
    return this.withPrice(price)
  }

  /**
   * 全フィールドの更新
   */
  withFullUpdate(): this {
    return this.withRandomName()
      .withCategoryId(testDataHelpers.categoryId())
      .withRandomMemo()
      .withPrice(testDataHelpers.price())
      .withPurchaseDate(testDataHelpers.todayString())
      .withExpiryInfo({
        bestBeforeDate: testDataHelpers.dateStringFromNow(10),
        useByDate: testDataHelpers.dateStringFromNow(7),
      })
      .withStock({
        quantity: testDataHelpers.quantity(),
        unitId: testDataHelpers.unitId(),
        storageLocation: {
          type: faker.helpers.arrayElement(['ROOM_TEMPERATURE', 'REFRIGERATED', 'FROZEN']),
          detail: faker.helpers.arrayElement(['野菜室', '冷凍庫', 'パントリー', null]),
        },
        threshold: faker.number.int({ min: 1, max: 10 }),
      })
  }

  build(): any {
    // APIに送信するJSON形式のオブジェクトを返す
    // ingredientIdはボディではなくURLパラメータから来るため除外
    return {
      ...(this.props.name !== undefined && { name: this.props.name }),
      ...(this.props.categoryId !== undefined && { categoryId: this.props.categoryId }),
      ...(this.props.memo !== undefined && { memo: this.props.memo }),
      ...(this.props.price !== undefined && { price: this.props.price }),
      ...(this.props.purchaseDate !== undefined && { purchaseDate: this.props.purchaseDate }),
      ...(this.props.expiryInfo !== undefined && { expiryInfo: this.props.expiryInfo }),
      ...(this.props.stock !== undefined && { stock: this.props.stock }),
    }
  }
}
