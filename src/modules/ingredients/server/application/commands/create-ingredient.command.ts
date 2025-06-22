import { StorageType } from '../../domain/value-objects'

/**
 * 食材作成コマンド
 * 食材の新規登録に必要な情報を保持する
 */
export class CreateIngredientCommand {
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
  readonly bestBeforeDate?: string
  readonly expiryDate?: string
  readonly purchaseDate: string
  readonly price?: number
  readonly memo?: string

  constructor(params: {
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
    bestBeforeDate?: string
    expiryDate?: string
    purchaseDate: string
    price?: number
    memo?: string
  }) {
    this.name = params.name
    this.categoryId = params.categoryId
    this.quantity = params.quantity
    this.storageLocation = params.storageLocation
    this.bestBeforeDate = params.bestBeforeDate
    this.expiryDate = params.expiryDate
    this.purchaseDate = params.purchaseDate
    this.price = params.price
    this.memo = params.memo
  }
}
