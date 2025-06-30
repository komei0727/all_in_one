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

// ドメイン固有の例外
export {
  CategoryNotFoundException,
  UnitNotFoundException,
  IngredientNotFoundException,
} from './not-found.exception'
export { DuplicateIngredientException } from './duplicate-ingredient.exception'
