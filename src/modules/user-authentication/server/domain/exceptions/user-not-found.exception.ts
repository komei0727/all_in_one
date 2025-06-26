import { NotFoundException } from '@/modules/shared/server/domain/exceptions'

/**
 * ユーザーが見つからない場合の例外
 */
export class UserNotFoundException extends NotFoundException {
  constructor(identifier: string | { nextAuthId?: string; email?: string; userId?: string }) {
    super('User', identifier)
  }
}
