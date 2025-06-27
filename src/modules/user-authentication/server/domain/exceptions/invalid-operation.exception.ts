import { OperationNotAllowedException } from '@/modules/shared/server/domain/exceptions'

/**
 * 無効化されたユーザーのプロフィール更新を試みた場合の例外
 */
export class ProfileUpdateNotAllowedException extends OperationNotAllowedException {
  constructor(_userId: string) {
    super('UPDATE_PROFILE', '無効化されたユーザーのプロフィールは更新できません')
  }
}
