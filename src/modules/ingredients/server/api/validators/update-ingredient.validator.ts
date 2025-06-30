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
 * 期限情報のバリデーションスキーマ
 */
const expiryInfoSchema = z
  .object({
    bestBeforeDate: dateStringSchema.nullable().optional(),
    useByDate: dateStringSchema.nullable().optional(),
  })
  .nullable()

/**
 * 食材更新リクエストのバリデーションスキーマ
 * すべてのフィールドは任意（部分更新をサポート）
 */
export const updateIngredientSchema = z.object({
  name: z
    .string()
    .min(1, { message: '食材名は必須です' })
    .max(50, { message: '食材名は50文字以内で入力してください' })
    .optional(),

  categoryId: idSchema.optional(),

  memo: z
    .string()
    .max(200, { message: 'メモは200文字以内で入力してください' })
    .nullable()
    .optional(),

  price: z
    .number()
    .nonnegative({ message: '価格は0以上の値を入力してください' })
    .max(9999999.99, { message: '価格は9999999.99以下で入力してください' })
    .nullable()
    .optional(),

  purchaseDate: dateStringSchema.optional(),

  expiryInfo: expiryInfoSchema.optional(),

  stock: z
    .object({
      quantity: z
        .number()
        .positive({ message: '数量は0より大きい値を入力してください' })
        .max(9999.99, { message: '数量は9999.99以下で入力してください' }),
      unitId: idSchema,
      storageLocation: z.object({
        type: storageTypeSchema,
        detail: z
          .string()
          .max(50, { message: '保管場所の詳細は50文字以内で入力してください' })
          .nullable()
          .optional(),
      }),
      threshold: z
        .number()
        .positive({ message: '閾値は0より大きい値を入力してください' })
        .max(9999.99, { message: '閾値は9999.99以下で入力してください' })
        .nullable()
        .optional(),
    })
    .optional(),
})

/**
 * 食材更新リクエストの型定義
 */
export type UpdateIngredientRequest = z.infer<typeof updateIngredientSchema>
