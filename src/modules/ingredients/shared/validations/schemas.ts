import { z } from 'zod'

import {
  INGREDIENT_STATUS,
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  PAGINATION_DEFAULTS,
} from '../constants'

// Helper schemas
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

// Create ingredient validation schema
export const createIngredientSchema = z.object({
  name: z
    .string()
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must be at most 100 characters'),
  quantity: z.number().min(0, 'Quantity must be at least 0').optional(),
  unit: z.enum(INGREDIENT_UNITS).optional(),
  expirationDate: dateStringSchema.optional(),
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
})

// Update ingredient validation schema
export const updateIngredientSchema = z.object({
  name: z
    .string()
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  quantity: z.number().min(0, 'Quantity must be at least 0').optional(),
  unit: z.enum(INGREDIENT_UNITS).optional(),
  expirationDate: dateStringSchema.optional(),
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
  status: z
    .enum([INGREDIENT_STATUS.AVAILABLE, INGREDIENT_STATUS.LOW, INGREDIENT_STATUS.OUT])
    .optional(),
})

// Get ingredients query params validation schema
export const getIngredientsParamsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(PAGINATION_DEFAULTS.MAX_LIMIT).optional(),
  status: z
    .enum([INGREDIENT_STATUS.AVAILABLE, INGREDIENT_STATUS.LOW, INGREDIENT_STATUS.OUT])
    .optional(),
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
  sort: z.enum(['name', 'expirationDate', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

// Get expiring ingredients query params validation schema
export const getExpiringIngredientsParamsSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
})

// Type exports
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>
export type GetIngredientsParams = z.infer<typeof getIngredientsParamsSchema>
export type GetExpiringIngredientsParams = z.infer<typeof getExpiringIngredientsParamsSchema>
