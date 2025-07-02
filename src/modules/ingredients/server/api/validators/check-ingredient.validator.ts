import { z } from 'zod'

/**
 * 食材チェックAPIのバリデーションスキーマ
 */
export const checkIngredientSchema = z.object({
  /** セッションID（必須） */
  sessionId: z
    .string()
    .min(1, 'セッションIDは必須です')
    .uuid('セッションIDは有効なUUID形式である必要があります'),

  /** 食材ID（必須） */
  ingredientId: z
    .string()
    .min(1, '食材IDは必須です')
    .uuid('食材IDは有効なUUID形式である必要があります'),

  /** ユーザーID（必須） */
  userId: z.string().min(1, 'ユーザーIDは必須です'),
})
