import { BusinessRuleException } from '@/modules/shared/server/domain/exceptions'

/**
 * セッション既完了例外
 * 既に完了済みのセッションに対して完了操作を実行しようとした場合に発生
 */
export class SessionAlreadyCompletedException extends BusinessRuleException {
  constructor(sessionId: string) {
    super(
      `買い物セッション ${sessionId} は既に完了しています`,
      undefined, // details
      'SESSION_ALREADY_COMPLETED' // code
    )
  }
}
