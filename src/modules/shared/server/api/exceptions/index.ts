// 基底例外
export { ApiException } from './api.exception'

// 具体的な例外クラス
export { ApiValidationException } from './api-validation.exception'
export { ApiNotFoundException } from './api-not-found.exception'
export { ApiBusinessRuleException } from './api-business-rule.exception'
export { ApiUnauthorizedException } from './api-unauthorized.exception'
export { ApiForbiddenException } from './api-forbidden.exception'
export { ApiInfrastructureException } from './api-infrastructure.exception'
export { ApiInternalException } from './api-internal.exception'

// 型定義
export type { ErrorContext } from './error-context'
