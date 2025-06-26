// 共有カーネルから再エクスポート
export {
  DomainException,
  NotFoundException,
  ValidationException,
  RequiredFieldException,
  InvalidFieldException,
  BusinessRuleException,
  DuplicateException,
  OperationNotAllowedException,
} from '@/modules/shared/server/domain/exceptions'

// ユーザー認証ドメイン固有の例外
export { UserNotFoundException } from './user-not-found.exception'
export { EmailAlreadyExistsException } from './email-already-exists.exception'
export { AccountDeactivatedException } from './account-deactivated.exception'
export { AlreadyDeactivatedException } from './already-deactivated.exception'
export {
  InvalidUserProfileException,
  InvalidDisplayNameException,
  InvalidTimezoneException,
  InvalidLanguageException,
} from './invalid-user-profile.exception'
export { ProfileUpdateNotAllowedException } from './invalid-operation.exception'
