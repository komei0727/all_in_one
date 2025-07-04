import { ValueObject } from '@/modules/shared/server/domain/value-objects'

/**
 * 期限状態を表す値オブジェクト
 */
export class ExpiryStatus extends ValueObject<string> {
  private static readonly VALID_STATUSES = [
    'FRESH',
    'NEAR_EXPIRY',
    'EXPIRING_SOON',
    'CRITICAL',
    'EXPIRED',
  ] as const
  private static readonly VALID_STATUSES_STRINGS: readonly string[] = ExpiryStatus.VALID_STATUSES
  private static readonly NEAR_EXPIRY_DAYS = 7 // 期限が近い日数閾値
  private static readonly EXPIRING_SOON_DAYS = 3 // 期限切れ間近の日数閾値
  private static readonly CRITICAL_DAYS = 1 // 危機的な日数閾値

  /** 新鮮 */
  static readonly FRESH = new ExpiryStatus('FRESH')
  /** 期限が近い */
  static readonly NEAR_EXPIRY = new ExpiryStatus('NEAR_EXPIRY')
  /** 期限切れ間近 */
  static readonly EXPIRING_SOON = new ExpiryStatus('EXPIRING_SOON')
  /** 危機的 */
  static readonly CRITICAL = new ExpiryStatus('CRITICAL')
  /** 期限切れ */
  static readonly EXPIRED = new ExpiryStatus('EXPIRED')

  private constructor(value: string) {
    super(value)
  }

  /**
   * 値のバリデーション
   */
  protected validate(value: string): void {
    const validStatuses = ['FRESH', 'NEAR_EXPIRY', 'EXPIRING_SOON', 'CRITICAL', 'EXPIRED']
    if (!value || !validStatuses.includes(value)) {
      throw new Error(`無効な期限ステータス: ${value}`)
    }
  }

  /**
   * 文字列からExpiryStatusを作成する
   */
  static from(value: string): ExpiryStatus {
    if (!value || !ExpiryStatus.VALID_STATUSES_STRINGS.includes(value)) {
      throw new Error(`無効な期限ステータス: ${value}`)
    }

    switch (value) {
      case 'FRESH':
        return ExpiryStatus.FRESH
      case 'NEAR_EXPIRY':
        return ExpiryStatus.NEAR_EXPIRY
      case 'EXPIRING_SOON':
        return ExpiryStatus.EXPIRING_SOON
      case 'CRITICAL':
        return ExpiryStatus.CRITICAL
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
    } else if (daysUntilExpiry <= ExpiryStatus.CRITICAL_DAYS) {
      return ExpiryStatus.CRITICAL
    } else if (daysUntilExpiry <= ExpiryStatus.EXPIRING_SOON_DAYS) {
      return ExpiryStatus.EXPIRING_SOON
    } else if (daysUntilExpiry <= ExpiryStatus.NEAR_EXPIRY_DAYS) {
      return ExpiryStatus.NEAR_EXPIRY
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
   * 期限が近いかどうかを判定
   */
  isNearExpiry(): boolean {
    return this.value === 'NEAR_EXPIRY'
  }

  /**
   * 期限切れ間近かどうかを判定
   */
  isExpiringSoon(): boolean {
    return this.value === 'EXPIRING_SOON'
  }

  /**
   * 危機的かどうかを判定
   */
  isCritical(): boolean {
    return this.value === 'CRITICAL'
  }

  /**
   * 期限切れかどうかを判定
   */
  isExpired(): boolean {
    return this.value === 'EXPIRED'
  }

  /**
   * 注意が必要かどうかを判定（期限が近い、期限切れ間近、危機的、または期限切れ）
   */
  needsAttention(): boolean {
    return this.isNearExpiry() || this.isExpiringSoon() || this.isCritical() || this.isExpired()
  }

  /**
   * 優先度を取得（数値が大きいほど優先度が高い）
   * EXPIRED: 5, CRITICAL: 4, EXPIRING_SOON: 3, NEAR_EXPIRY: 2, FRESH: 1
   */
  getPriority(): number {
    switch (this.value) {
      case 'EXPIRED':
        return 5
      case 'CRITICAL':
        return 4
      case 'EXPIRING_SOON':
        return 3
      case 'NEAR_EXPIRY':
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
