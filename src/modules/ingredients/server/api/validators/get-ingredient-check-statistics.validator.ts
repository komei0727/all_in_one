import { z } from 'zod'

/**
 * 食材チェック統計取得APIのバリデーションスキーマ
 */
export const getIngredientCheckStatisticsSchema = z.object({
  /** ユーザーID（必須） */
  userId: z.string().min(1, 'ユーザーIDは必須です'),

  /** 食材ID（オプション） */
  ingredientId: z
    .union([
      // UUID形式
      z.string().uuid('ingredientId must be a valid UUID or prefixed ID'),
      // プレフィックス付きID形式 (ing_xxxx)
      z.string().regex(/^ing_[a-zA-Z0-9]+$/, 'ingredientId must be a valid UUID or prefixed ID'),
      z.literal('').transform(() => undefined),
      z.undefined(),
    ])
    .optional(),
})
