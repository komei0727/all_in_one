import { DuplicateException } from '@/modules/shared/server/domain/exceptions'

/**
 * メールアドレスが既に使用されている場合の例外
 */
export class EmailAlreadyExistsException extends DuplicateException {
  constructor(email: string) {
    super('User', 'email', email)
  }
}
