import { ValueObject } from '@/modules/shared/server/domain/value-objects'

/**
 * 買い物セッションのステータスを表す値オブジェクト
 */
export class SessionStatus extends ValueObject<string> {
  private static readonly VALID_STATUSES = ['ACTIVE', 'COMPLETED', 'ABANDONED'] as const
  private static readonly VALID_STATUSES_STRINGS: readonly string[] = SessionStatus.VALID_STATUSES

  /** アクティブ（実行中）のセッション */
  static readonly ACTIVE = new SessionStatus('ACTIVE')
  /** 完了したセッション */
  static readonly COMPLETED = new SessionStatus('COMPLETED')
  /** 中断されたセッション */
  static readonly ABANDONED = new SessionStatus('ABANDONED')

  private constructor(value: string) {
    super(value)
  }

  /**
   * 値のバリデーション
   */
  protected validate(value: string): void {
    // 静的初期化時はVALID_STATUSESが未定義の可能性があるため、直接チェック
    const validStatuses = ['ACTIVE', 'COMPLETED', 'ABANDONED']
    if (!value || !validStatuses.includes(value)) {
      throw new Error(`無効なセッションステータス: ${value}`)
    }
  }

  /**
   * 文字列からSessionStatusを作成する
   */
  static from(value: string): SessionStatus {
    if (!value || !SessionStatus.VALID_STATUSES_STRINGS.includes(value)) {
      throw new Error(`無効なセッションステータス: ${value}`)
    }

    switch (value) {
      case 'ACTIVE':
        return SessionStatus.ACTIVE
      case 'COMPLETED':
        return SessionStatus.COMPLETED
      case 'ABANDONED':
        return SessionStatus.ABANDONED
      default:
        throw new Error(`無効なセッションステータス: ${value}`)
    }
  }

  /**
   * アクティブなセッションかどうかを判定
   */
  isActive(): boolean {
    return this.value === 'ACTIVE'
  }

  /**
   * 完了したセッションかどうかを判定
   */
  isCompleted(): boolean {
    return this.value === 'COMPLETED'
  }

  /**
   * 中断されたセッションかどうかを判定
   */
  isAbandoned(): boolean {
    return this.value === 'ABANDONED'
  }

  /**
   * 終了したセッション（完了または中断）かどうかを判定
   */
  isFinished(): boolean {
    return this.isCompleted() || this.isAbandoned()
  }

  /**
   * 指定されたステータスへの遷移が可能かどうかを判定
   */
  canTransitionTo(newStatus: SessionStatus): boolean {
    // アクティブなセッションのみ状態遷移可能
    if (!this.isActive()) {
      return false
    }

    // 同じステータスへの遷移は不可
    if (this.equals(newStatus)) {
      return false
    }

    // アクティブから完了または中断への遷移のみ許可
    return newStatus.isCompleted() || newStatus.isAbandoned()
  }

  toString(): string {
    return this.value
  }
}
