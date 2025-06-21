// Status constants
export const INGREDIENT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  LOW: 'LOW',
  OUT: 'OUT',
} as const

// TODO: These should be defined based on business requirements
// For now, using common categories and units
export const INGREDIENT_CATEGORIES = [
  'VEGETABLE',
  'FRUIT',
  'MEAT',
  'DAIRY',
  'SEAFOOD',
  'GRAIN',
  'SEASONING',
  'OTHER',
] as const

export const INGREDIENT_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'piece',
  'pack',
  'bunch',
  'bottle',
] as const

// Sort options
export const SORT_OPTIONS = {
  NAME: 'name',
  EXPIRATION_DATE: 'expirationDate',
  UPDATED_AT: 'updatedAt',
} as const

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const

// Default expiring days
export const DEFAULT_EXPIRING_DAYS = 7