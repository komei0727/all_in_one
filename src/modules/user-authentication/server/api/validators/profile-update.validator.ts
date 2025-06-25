import { z } from 'zod'

/**
 * プロフィール更新リクエストのバリデーションスキーマ
 */
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, '表示名は必須です')
    .max(100, '表示名は100文字以内で入力してください'),
  timezone: z.string().trim().min(1, 'タイムゾーンは必須です'),
  language: z.enum(['ja', 'en'], {
    errorMap: () => ({ message: 'サポートされていない言語です' }),
  }),
})

/**
 * プロフィール更新リクエストの型
 */
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>
