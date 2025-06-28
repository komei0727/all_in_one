import { ValueObject } from '@/modules/shared/server/domain/value-objects'

/**
 * 期限状態を表す値オブジェクト
 */
export class ExpiryStatus extends ValueObject<string> {
  private static readonly VALID_STATUSES = ['FRESH', 'EXPIRING_SOON', 'EXPIRED'] as const
  private static readonly EXPIRING_SOON_DAYS = 3 // 期限切れ間近の日数閾値

  /** 新鮮 */
  static readonly FRESH = new ExpiryStatus('FRESH')
  /** 期限切れ間近 */
  static readonly EXPIRING_SOON = new ExpiryStatus('EXPIRING_SOON')
  /** 期限切れ */
  static readonly EXPIRED = new ExpiryStatus('EXPIRED')

  private constructor(value: string) {
    super(value)
  }

  /**
   * 値のバリデーション
   */
  protected validate(value: string): void {
    const validStatuses = ['FRESH', 'EXPIRING_SOON', 'EXPIRED']
    if (!value || !validStatuses.includes(value)) {
      throw new Error(`無効な期限ステータス: ${value}`)
    }
  }

  /**
   * 文字列からExpiryStatusを作成する
   */
  static from(value: string): ExpiryStatus {
    if (!value || !ExpiryStatus.VALID_STATUSES.includes(value as any)) {
      throw new Error(`無効な期限ステータス: ${value}`)
    }

    switch (value) {
      case 'FRESH':
        return ExpiryStatus.FRESH
      case 'EXPIRING_SOON':
        return ExpiryStatus.EXPIRING_SOON
      case 'EXPIRED':
        return ExpiryStatus.EXPIRED
      default:
        throw new Error(`無効な期限ステータス: ${value}`)
    }
  }

  /**
   * 期限までの日数からステータスを判定する
   * @param daysUntilExpiry 期限までの日数（nullの場合は期限なし）
   */
  static fromDaysUntilExpiry(daysUntilExpiry: number | null): ExpiryStatus {
    if (daysUntilExpiry === null) {
      return ExpiryStatus.FRESH
    }

    if (daysUntilExpiry <= 0) {
      return ExpiryStatus.EXPIRED
    } else if (daysUntilExpiry <= ExpiryStatus.EXPIRING_SOON_DAYS) {
      return ExpiryStatus.EXPIRING_SOON
    } else {
      return ExpiryStatus.FRESH
    }
  }

  /**
   * 新鮮かどうかを判定
   */
  isFresh(): boolean {
    return this.value === 'FRESH'
  }

  /**
   * 期限切れ間近かどうかを判定
   */
  isExpiringSoon(): boolean {
    return this.value === 'EXPIRING_SOON'
  }

  /**
   * 期限切れかどうかを判定
   */
  isExpired(): boolean {
    return this.value === 'EXPIRED'
  }

  /**
   * 注意が必要かどうかを判定（期限切れ間近または期限切れ）
   */
  needsAttention(): boolean {
    return this.isExpiringSoon() || this.isExpired()
  }

  /**
   * 優先度を取得（数値が大きいほど優先度が高い）
   * EXPIRED: 3, EXPIRING_SOON: 2, FRESH: 1
   */
  getPriority(): number {
    switch (this.value) {
      case 'EXPIRED':
        return 3
      case 'EXPIRING_SOON':
        return 2
      case 'FRESH':
        return 1
      default:
        return 0
    }
  }

  /**
   * 他のステータスより優先度が高いかを判定
   */
  hasHigherPriorityThan(other: ExpiryStatus): boolean {
    return this.getPriority() > other.getPriority()
  }

  toString(): string {
    return this.value
  }
}
