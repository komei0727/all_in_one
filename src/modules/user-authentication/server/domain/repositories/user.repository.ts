import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { User } from '../entities/user.entity'

/**
 * ユーザーリポジトリインターフェース
 * ドメイン層でのユーザーデータ永続化の契約を定義
 */
export interface UserRepository {
  /**
   * ユーザーIDでユーザーを検索
   * @param id ユーザーID
   * @returns ユーザーエンティティ、見つからない場合はnull
   */
  findById(id: UserId): Promise<User | null>

  /**
   * NextAuth IDでユーザーを検索
   * @param nextAuthId NextAuth ID
   * @returns ユーザーエンティティ、見つからない場合はnull
   */
  findByNextAuthId(nextAuthId: string): Promise<User | null>

  /**
   * メールアドレスでユーザーを検索
   * @param email メールアドレス
   * @returns ユーザーエンティティ、見つからない場合はnull
   */
  findByEmail(email: Email): Promise<User | null>

  /**
   * ユーザーを保存（新規作成または更新）
   * @param user ユーザーエンティティ
   * @returns 保存されたユーザーエンティティ
   */
  save(user: User): Promise<User>

  /**
   * ユーザーを削除（論理削除）
   * @param id ユーザーID
   * @returns 削除が成功した場合はtrue
   */
  delete(id: UserId): Promise<boolean>

  /**
   * アクティブなユーザーの一覧を取得
   * @param limit 取得件数の上限（デフォルト100）
   * @param offset オフセット（デフォルト0）
   * @returns アクティブなユーザー一覧
   */
  findActiveUsers(limit?: number, offset?: number): Promise<User[]>

  /**
   * NextAuth IDが既に存在するかチェック
   * @param nextAuthId NextAuth ID
   * @returns 存在する場合はtrue
   */
  existsByNextAuthId(nextAuthId: string): Promise<boolean>

  /**
   * メールアドレスが既に存在するかチェック
   * @param email メールアドレス
   * @returns 存在する場合はtrue
   */
  existsByEmail(email: Email): Promise<boolean>

  /**
   * 指定した期間内にログインしたユーザー数を取得
   * @param days 期間（日数）
   * @returns ログインユーザー数
   */
  countActiveUsersInPeriod(days: number): Promise<number>
}