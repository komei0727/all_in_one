import { StorageLocation } from './storage-location.vo'
import { UnitId } from './unit-id.vo'
import { ValidationException } from '../exceptions/validation.exception'

/**
 * 食材在庫値オブジェクト
 * 食材の在庫情報（数量、単位、保存場所、閾値）を一体として管理する
 */
export class IngredientStock {
  private readonly quantity: number
  private readonly unitId: UnitId
  private readonly storageLocation: StorageLocation
  private readonly threshold: number | null

  constructor(props: {
    quantity: number
    unitId: UnitId
    storageLocation: StorageLocation
    threshold?: number | null
  }) {
    this.validate(props)
    this.quantity = props.quantity
    this.unitId = props.unitId
    this.storageLocation = props.storageLocation
    this.threshold = props.threshold ?? null
  }

  /**
   * バリデーション
   * @throws {ValidationException} 無効な値の場合
   */
  private validate(props: { quantity: number; threshold?: number | null }): void {
    if (props.quantity < 0) {
      throw new ValidationException('在庫数量は0以上の値を指定してください')
    }

    if (props.threshold !== undefined && props.threshold !== null && props.threshold < 0) {
      throw new ValidationException('在庫閾値は0以上の値を指定してください')
    }
  }

  /**
   * 在庫数量を取得
   */
  getQuantity(): number {
    return this.quantity
  }

  /**
   * 単位IDを取得
   */
  getUnitId(): UnitId {
    return this.unitId
  }

  /**
   * 保存場所を取得
   */
  getStorageLocation(): StorageLocation {
    return this.storageLocation
  }

  /**
   * 在庫閾値を取得
   */
  getThreshold(): number | null {
    return this.threshold
  }

  /**
   * 在庫切れかどうか判定
   */
  isOutOfStock(): boolean {
    return this.quantity === 0
  }

  /**
   * 在庫不足かどうか判定（閾値以下）
   */
  isLowStock(): boolean {
    if (this.threshold === null) {
      return false
    }
    return this.quantity <= this.threshold
  }

  /**
   * 在庫を追加
   */
  add(amount: number): IngredientStock {
    return new IngredientStock({
      quantity: this.quantity + amount,
      unitId: this.unitId,
      storageLocation: this.storageLocation,
      threshold: this.threshold,
    })
  }

  /**
   * 在庫を減らす（0未満にはならない）
   */
  subtract(amount: number): IngredientStock {
    const newQuantity = Math.max(0, this.quantity - amount)
    return new IngredientStock({
      quantity: newQuantity,
      unitId: this.unitId,
      storageLocation: this.storageLocation,
      threshold: this.threshold,
    })
  }

  /**
   * 値の比較
   */
  equals(other: IngredientStock): boolean {
    return (
      this.quantity === other.quantity &&
      this.unitId.equals(other.unitId) &&
      this.storageLocation.equals(other.storageLocation) &&
      this.threshold === other.threshold
    )
  }

  /**
   * プレーンオブジェクトに変換
   */
  toObject(): {
    quantity: number
    unitId: string
    storageLocation: { type: string; detail: string | null }
    threshold: number | null
  } {
    return {
      quantity: this.quantity,
      unitId: this.unitId.getValue(),
      storageLocation: this.storageLocation.toObject(),
      threshold: this.threshold,
    }
  }

  /**
   * プレーンオブジェクトから作成
   */
  static fromObject(obj: {
    quantity: number
    unitId: string
    storageLocation: { type: any; detail?: string }
    threshold?: number | null
  }): IngredientStock {
    return new IngredientStock({
      quantity: obj.quantity,
      unitId: new UnitId(obj.unitId),
      storageLocation: StorageLocation.fromObject(obj.storageLocation),
      threshold: obj.threshold ?? null,
    })
  }
}
