import { z } from 'zod'

/**
 * クイックアクセス食材取得リクエストのバリデーションスキーマ
 */
export const getQuickAccessIngredientsSchema = z.object({
  userId: z.string().min(1, 'ユーザーIDは必須です'),
  limit: z
    .number()
    .int('取得件数は整数である必要があります')
    .min(1, '取得件数は1以上50以下である必要があります')
    .max(50, '取得件数は1以上50以下である必要があります')
    .default(20),
})

/**
 * クイックアクセス食材取得リクエストの型
 */
export type GetQuickAccessIngredientsRequest = z.infer<typeof getQuickAccessIngredientsSchema>
