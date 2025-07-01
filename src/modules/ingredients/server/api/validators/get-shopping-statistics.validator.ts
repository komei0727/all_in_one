import { z } from 'zod'

/**
 * 買い物統計取得APIのバリデータ
 */
export const getShoppingStatisticsValidator = z.object({
  periodDays: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 30 // デフォルト値
      const parsed = parseInt(val, 10)
      if (isNaN(parsed)) {
        throw new Error('periodDays must be a valid integer')
      }
      return parsed
    })
    .refine((val) => val >= 1 && val <= 365, {
      message: 'periodDays must be between 1 and 365',
    }),
})

export type GetShoppingStatisticsInput = z.infer<typeof getShoppingStatisticsValidator>
