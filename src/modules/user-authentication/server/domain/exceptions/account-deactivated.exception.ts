import { DomainException } from '@/modules/shared/server/domain/exceptions'

/**
 * アカウントが無効化されている場合の例外
 */
export class AccountDeactivatedException extends DomainException {
  readonly httpStatusCode = 403
  readonly errorCode = 'ACCOUNT_DEACTIVATED'

  constructor(userId: string) {
    super('アカウントが無効化されています', {
      userId,
      action: 'LOGIN_ATTEMPT',
    })
  }
}
