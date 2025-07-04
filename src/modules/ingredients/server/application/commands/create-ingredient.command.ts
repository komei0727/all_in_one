import type { StorageType } from '../../domain/value-objects'

/**
 * 食材作成コマンド
 * 食材の新規登録に必要な情報を保持する
 */
export class CreateIngredientCommand {
  readonly userId: string
  readonly name: string
  readonly categoryId: string
  readonly quantity: {
    amount: number
    unitId: string
  }
  readonly storageLocation: {
    type: StorageType
    detail?: string
  }
  readonly threshold?: number
  readonly expiryInfo?: {
    bestBeforeDate?: string | null
    useByDate?: string | null
  } | null
  readonly purchaseDate: string
  readonly price?: number
  readonly memo?: string

  constructor(params: {
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
  }) {
    this.userId = params.userId
    this.name = params.name
    this.categoryId = params.categoryId
    this.quantity = params.quantity
    this.storageLocation = params.storageLocation
    this.threshold = params.threshold
    this.expiryInfo = params.expiryInfo
    this.purchaseDate = params.purchaseDate
    this.price = params.price
    this.memo = params.memo
  }
}
