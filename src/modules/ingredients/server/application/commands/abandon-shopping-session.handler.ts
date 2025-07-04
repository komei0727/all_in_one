import { NotFoundException } from '../../domain/exceptions'
import { ShoppingSessionId } from '../../domain/value-objects'

import type { AbandonShoppingSessionCommand } from './abandon-shopping-session.command'
import type { ShoppingSessionRepository } from '../../domain/repositories/shopping-session-repository.interface'

/**
 * 買い物セッション中断ハンドラー
 * 買い物セッションを中断するビジネスロジックを実行する
 */
export class AbandonShoppingSessionHandler {
  constructor(private readonly shoppingSessionRepository: ShoppingSessionRepository) {}

  /**
   * 買い物セッションを中断する
   * @param command 中断コマンド
   * @throws {NotFoundException} セッションが見つからない場合
   * @throws {BusinessRuleException} セッションが既に完了または中断済みの場合
   */
  async handle(command: AbandonShoppingSessionCommand): Promise<void> {
    // セッションIDの値オブジェクトを作成
    const sessionId = new ShoppingSessionId(command.sessionId)

    // セッションを取得
    const session = await this.shoppingSessionRepository.findById(sessionId)
    if (!session) {
      throw new NotFoundException('買い物セッション', command.sessionId)
    }

    // ユーザーの権限チェック
    if (session.getUserId() !== command.userId) {
      throw new NotFoundException('買い物セッション', command.sessionId)
    }

    // セッションを中断
    session.abandon()

    // セッションを保存（既存なのでupdateを使用）
    await this.shoppingSessionRepository.update(session)
  }
}
