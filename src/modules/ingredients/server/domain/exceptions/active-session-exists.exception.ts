import { BusinessRuleException } from '@/modules/shared/server/domain/exceptions'

/**
 * アクティブな買い物セッションが既に存在する場合の例外
 */
export class ActiveShoppingSessionExistsException extends BusinessRuleException {
  constructor() {
    super(
      '同一ユーザーで同時にアクティブなセッションは1つのみです',
      undefined,
      'ACTIVE_SESSION_EXISTS'
    )
  }
}
