import type { ShoppingSession } from '../entities/shopping-session.entity'
import type { ShoppingSessionId } from '../value-objects'

/**
 * 買い物セッションリポジトリのインターフェース
 */
export interface ShoppingSessionRepository {
  /**
   * IDで買い物セッションを取得
   * @param id セッションID
   * @returns 買い物セッション（存在しない場合はnull）
   */
  findById(id: ShoppingSessionId): Promise<ShoppingSession | null>

  /**
   * ユーザーIDでアクティブなセッションを取得
   * @param userId ユーザーID
   * @returns アクティブなセッション（存在しない場合はnull）
   */
  findActiveByUserId(userId: string): Promise<ShoppingSession | null>

  /**
   * 買い物セッションを保存
   * @param session 保存するセッション
   * @returns 保存されたセッション
   */
  save(session: ShoppingSession): Promise<ShoppingSession>

  /**
   * 買い物セッションを更新
   * @param session 更新するセッション
   * @returns 更新されたセッション
   */
  update(session: ShoppingSession): Promise<ShoppingSession>
}
