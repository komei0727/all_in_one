import { BusinessRuleException } from '@/modules/shared/server/domain/exceptions'

/**
 * 既に無効化されたユーザーの場合の例外
 */
export class AlreadyDeactivatedException extends BusinessRuleException {
  constructor(userId: string) {
    super('既に無効化されたユーザーです', {
      userId,
      currentStatus: 'DEACTIVATED',
    })
  }
}
