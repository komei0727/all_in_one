import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

/**
 * ユーザーステータス型
 */
export type UserStatusType = 'ACTIVE' | 'DEACTIVATED'

/**
 * ユーザーステータス値オブジェクト
 * ユーザーの現在のステータス（アクティブ・無効化）を表現する
 */
export class UserStatus extends ValueObject<UserStatusType> {
  private static readonly VALID_STATUSES: UserStatusType[] = ['ACTIVE', 'DEACTIVATED']

  constructor(value: UserStatusType) {
    super(value)
  }

  protected validate(value: UserStatusType): void {
    // 必須チェック
    if (value === null || value === undefined) {
      throw new Error('ユーザーステータスは必須です')
    }

    // 有効なステータスかチェック
    if (!UserStatus.VALID_STATUSES.includes(value)) {
      throw new Error('無効なユーザーステータスです')
    }
  }

  /**
   * ユーザーがアクティブかどうかを判定
   */
  isActive(): boolean {
    return this.value === 'ACTIVE'
  }

  /**
   * ユーザーが無効化されているかどうかを判定
   */
  isDeactivated(): boolean {
    return this.value === 'DEACTIVATED'
  }

  /**
   * ユーザーがログイン可能かどうかを判定
   */
  canLogin(): boolean {
    return this.isActive()
  }

  /**
   * アクティブ化した新しいインスタンスを作成
   */
  activate(): UserStatus {
    return new UserStatus('ACTIVE')
  }

  /**
   * 無効化した新しいインスタンスを作成
   */
  deactivate(): UserStatus {
    return new UserStatus('DEACTIVATED')
  }

  /**
   * 等価性を比較
   */
  equals(other: UserStatus): boolean {
    if (!(other instanceof UserStatus)) {
      return false
    }
    return this.value === other.value
  }

  /**
   * アクティブステータスのインスタンスを作成
   */
  static createActive(): UserStatus {
    return new UserStatus('ACTIVE')
  }

  /**
   * 無効化ステータスのインスタンスを作成
   */
  static createDeactivated(): UserStatus {
    return new UserStatus('DEACTIVATED')
  }
}
