import { ValueObject } from '@/modules/shared/server/domain/value-objects'

/**
 * 在庫状態を表す値オブジェクト
 */
export class StockStatus extends ValueObject<string> {
  private static readonly VALID_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const

  /** 在庫あり */
  static readonly IN_STOCK = new StockStatus('IN_STOCK')
  /** 在庫少 */
  static readonly LOW_STOCK = new StockStatus('LOW_STOCK')
  /** 在庫切れ */
  static readonly OUT_OF_STOCK = new StockStatus('OUT_OF_STOCK')

  private constructor(value: string) {
    super(value)
  }

  /**
   * 値のバリデーション
   */
  protected validate(value: string): void {
    const validStatuses = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']
    if (!value || !validStatuses.includes(value)) {
      throw new Error(`無効な在庫ステータス: ${value}`)
    }
  }

  /**
   * 文字列からStockStatusを作成する
   */
  static from(value: string): StockStatus {
    if (!value || !StockStatus.VALID_STATUSES.includes(value as any)) {
      throw new Error(`無効な在庫ステータス: ${value}`)
    }

    switch (value) {
      case 'IN_STOCK':
        return StockStatus.IN_STOCK
      case 'LOW_STOCK':
        return StockStatus.LOW_STOCK
      case 'OUT_OF_STOCK':
        return StockStatus.OUT_OF_STOCK
      default:
        throw new Error(`無効な在庫ステータス: ${value}`)
    }
  }

  /**
   * 在庫ありかどうかを判定
   */
  isInStock(): boolean {
    return this.value === 'IN_STOCK'
  }

  /**
   * 在庫少かどうかを判定
   */
  isLowStock(): boolean {
    return this.value === 'LOW_STOCK'
  }

  /**
   * 在庫切れかどうかを判定
   */
  isOutOfStock(): boolean {
    return this.value === 'OUT_OF_STOCK'
  }

  /**
   * 補充が必要かどうかを判定（在庫少または在庫切れ）
   */
  needsReplenishment(): boolean {
    return this.isLowStock() || this.isOutOfStock()
  }

  /**
   * 優先度を取得（数値が大きいほど優先度が高い）
   * OUT_OF_STOCK: 3, LOW_STOCK: 2, IN_STOCK: 1
   */
  getPriority(): number {
    switch (this.value) {
      case 'OUT_OF_STOCK':
        return 3
      case 'LOW_STOCK':
        return 2
      case 'IN_STOCK':
        return 1
      default:
        return 0
    }
  }

  /**
   * 他のステータスより優先度が高いかを判定
   */
  hasHigherPriorityThan(other: StockStatus): boolean {
    return this.getPriority() > other.getPriority()
  }

  toString(): string {
    return this.value
  }
}
