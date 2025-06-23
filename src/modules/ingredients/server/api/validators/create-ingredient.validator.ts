import { z } from 'zod'

/**
 * ID形式のバリデーションスキーマ（UUID または CUID形式）
 */
const idSchema = z.string().min(8, {
  message: '有効なID形式で入力してください',
})

/**
 * 日付形式のバリデーションスキーマ（YYYY-MM-DD）
 */
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: '日付はYYYY-MM-DD形式で入力してください',
})

/**
 * 保管場所タイプのバリデーションスキーマ
 */
const storageTypeSchema = z.enum(['REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE'], {
  errorMap: () => ({
    message: '保管場所タイプは REFRIGERATED, FROZEN, ROOM_TEMPERATURE のいずれかを選択してください',
  }),
})

/**
 * 食材作成リクエストのバリデーションスキーマ
 */
export const createIngredientSchema = z.object({
  name: z
    .string()
    .min(1, { message: '食材名は必須です' })
    .max(50, { message: '食材名は50文字以内で入力してください' }),

  categoryId: idSchema,

  quantity: z.object({
    amount: z
      .number()
      .positive({ message: '数量は0より大きい値を入力してください' })
      .max(9999.99, { message: '数量は9999.99以下で入力してください' }),
    unitId: idSchema,
  }),

  storageLocation: z.object({
    type: storageTypeSchema,
    detail: z
      .string()
      .max(50, { message: '保管場所の詳細は50文字以内で入力してください' })
      .optional(),
  }),

  bestBeforeDate: dateStringSchema.optional(),

  expiryDate: dateStringSchema.optional(),

  purchaseDate: dateStringSchema,

  price: z
    .number()
    .nonnegative({ message: '価格は0以上の値を入力してください' })
    .max(9999999.99, { message: '価格は9999999.99以下で入力してください' })
    .optional(),

  memo: z.string().max(200, { message: 'メモは200文字以内で入力してください' }).optional(),
})

/**
 * 食材作成リクエストの型定義
 */
export type CreateIngredientRequest = z.infer<typeof createIngredientSchema>
