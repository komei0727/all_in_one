import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserProfile } from '../value-objects/user-profile.vo'
import { UserStatus } from '../value-objects/user-status.vo'

/**
 * ユーザーエンティティのプロパティ
 */
export interface UserProps {
  id: UserId
  nextAuthId: string
  email: Email
  profile: UserProfile
  status: UserStatus
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
}

/**
 * NextAuthユーザー情報
 */
export interface NextAuthUser {
  id: string
  email: string
  emailVerified: Date | null
  name: string | null
  image: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * ユーザーエンティティ
 * ユーザーアカウントを表現するルートエンティティ
 */
export class User {
  private readonly _id: UserId
  private _nextAuthId: string
  private _email: Email
  private _profile: UserProfile
  private _status: UserStatus
  private readonly _createdAt: Date
  private _updatedAt: Date
  private _lastLoginAt: Date | null

  constructor(props: UserProps) {
    this.validate(props)
    
    this._id = props.id
    this._nextAuthId = props.nextAuthId
    this._email = props.email
    this._profile = props.profile
    this._status = props.status
    this._createdAt = props.createdAt
    this._updatedAt = props.updatedAt
    this._lastLoginAt = props.lastLoginAt
  }

  /**
   * プロパティのバリデーション
   */
  private validate(props: UserProps): void {
    // 必須プロパティのチェック
    if (!props.id) {
      throw new Error('ユーザーIDは必須です')
    }
    
    if (!props.nextAuthId || props.nextAuthId.trim() === '') {
      throw new Error('NextAuth IDは必須です')
    }
    
    if (!props.email) {
      throw new Error('メールアドレスは必須です')
    }
    
    if (!props.profile) {
      throw new Error('プロフィールは必須です')
    }
    
    if (!props.status) {
      throw new Error('ユーザーステータスは必須です')
    }
    
    if (!props.createdAt) {
      throw new Error('作成日時は必須です')
    }
    
    if (!props.updatedAt) {
      throw new Error('更新日時は必須です')
    }
    
    // 日時の整合性チェック
    if (props.createdAt > props.updatedAt) {
      throw new Error('更新日時は作成日時以降である必要があります')
    }
  }

  /**
   * NextAuthユーザーからドメインユーザーを作成
   */
  static createFromNextAuth(nextAuthUser: NextAuthUser): User {
    const now = new Date()
    
    return new User({
      id: new UserId(crypto.randomUUID()),
      nextAuthId: nextAuthUser.id,
      email: new Email(nextAuthUser.email),
      profile: UserProfile.createDefault(nextAuthUser.name || nextAuthUser.email),
      status: UserStatus.createActive(),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    })
  }

  /**
   * NextAuthユーザーからカスタムプロフィール付きでドメインユーザーを作成
   */
  static createFromNextAuthWithProfile(nextAuthUser: NextAuthUser, profile: UserProfile): User {
    const now = new Date()
    
    return new User({
      id: new UserId(crypto.randomUUID()),
      nextAuthId: nextAuthUser.id,
      email: new Email(nextAuthUser.email),
      profile: profile,
      status: UserStatus.createActive(),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    })
  }

  /**
   * ユーザーIDを取得
   */
  getId(): UserId {
    return this._id
  }

  /**
   * NextAuth IDを取得
   */
  getNextAuthId(): string {
    return this._nextAuthId
  }

  /**
   * メールアドレスを取得
   */
  getEmail(): Email {
    return this._email
  }

  /**
   * プロフィールを取得
   */
  getProfile(): UserProfile {
    return this._profile
  }

  /**
   * ユーザーステータスを取得
   */
  getStatus(): UserStatus {
    return this._status
  }

  /**
   * 作成日時を取得
   */
  getCreatedAt(): Date {
    return this._createdAt
  }

  /**
   * 更新日時を取得
   */
  getUpdatedAt(): Date {
    return this._updatedAt
  }

  /**
   * 最終ログイン日時を取得
   */
  getLastLoginAt(): Date | null {
    return this._lastLoginAt
  }

  /**
   * ユーザーがアクティブかどうかを判定
   */
  isActive(): boolean {
    return this._status.isActive()
  }

  /**
   * ユーザーがログイン可能かどうかを判定
   */
  canLogin(): boolean {
    return this._status.canLogin()
  }

  /**
   * ユーザーを無効化
   */
  deactivate(): void {
    if (this._status.isDeactivated()) {
      throw new Error('既に無効化されたユーザーです')
    }
    
    this._status = this._status.deactivate()
    this._updatedAt = new Date()
  }

  /**
   * プロフィールを更新
   */
  updateProfile(profile: UserProfile): void {
    if (!profile) {
      throw new Error('プロフィールは必須です')
    }
    
    if (!this.isActive()) {
      throw new Error('無効化されたユーザーのプロフィールは更新できません')
    }
    
    this._profile = profile
    this._updatedAt = new Date()
  }

  /**
   * ログインを記録
   */
  recordLogin(loginTime?: Date): void {
    if (!this.canLogin()) {
      throw new Error('無効化されたユーザーはログインできません')
    }
    
    this._lastLoginAt = loginTime || new Date()
  }

  /**
   * NextAuthユーザーと同期
   */
  syncWithNextAuth(nextAuthUser: NextAuthUser): void {
    if (this._nextAuthId !== nextAuthUser.id) {
      throw new Error('NextAuth IDが一致しません')
    }
    
    // メールアドレスの同期
    if (this._email.getValue() !== nextAuthUser.email) {
      this._email = new Email(nextAuthUser.email)
      this._updatedAt = new Date()
    }
  }

  /**
   * エンティティの等価性を比較
   * エンティティの等価性はIDで判断する
   */
  equals(other: User): boolean {
    if (!(other instanceof User)) {
      return false
    }
    
    return this._id.equals(other._id)
  }
}