import type { INGREDIENT_STATUS, INGREDIENT_CATEGORIES, INGREDIENT_UNITS } from '../constants'

// Ingredient status values
export type IngredientStatus = (typeof INGREDIENT_STATUS)[keyof typeof INGREDIENT_STATUS]

// Ingredient categories
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]

// Ingredient units
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number]

// API response type for ingredient
export interface IngredientResponse {
  id: string
  name: string
  quantity?: number
  unit?: string
  expirationDate?: string // ISO 8601 format
  category?: string
  status: IngredientStatus
  createdAt: string // ISO 8601 format
  updatedAt: string // ISO 8601 format
}

// Input type for creating ingredient
export interface CreateIngredientInput {
  name: string
  quantity?: number
  unit?: string
  expirationDate?: string // ISO 8601 format
  category?: string
}

// Input type for updating ingredient
export interface UpdateIngredientInput {
  name?: string
  quantity?: number
  unit?: string
  expirationDate?: string // ISO 8601 format
  category?: string
  status?: IngredientStatus
}

// Query parameters for listing ingredients
export interface GetIngredientsParams {
  page?: number
  limit?: number
  status?: IngredientStatus
  category?: string
  sort?: 'name' | 'expirationDate' | 'updatedAt'
  order?: 'asc' | 'desc'
}

// Query parameters for getting expiring ingredients
export interface GetExpiringIngredientsParams {
  days?: number
}

// Common response types
export interface SuccessResponse<T> {
  data: T
  success: true
}

export interface ErrorResponse {
  error: string
  success: false
  code?: string
  details?: Record<string, string[]>
}

// Pagination info
export interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
}

// Response type for listing ingredients
export interface GetIngredientsResponse
  extends SuccessResponse<{
    items: IngredientResponse[]
    pagination: PaginationInfo
  }> {}

// Response type for getting expiring ingredients
export interface GetExpiringIngredientsResponse
  extends SuccessResponse<{
    items: IngredientResponse[]
    count: number
  }> {}
