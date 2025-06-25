/**
 * ドメインサービスのエクスポート
 */

export { DuplicateCheckService } from './duplicate-check.service'
export { ExpiryCheckService } from './expiry-check.service'
export {
  StockCalculationService,
  type StockRequirement,
  type CategoryAggregation,
} from './stock-calculation.service'
