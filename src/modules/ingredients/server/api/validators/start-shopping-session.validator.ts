import { z } from 'zod'

/**
 * 買い物セッション開始リクエストのバリデーションスキーマ
 */
export const startShoppingSessionSchema = z.object({
  deviceType: z.enum(['MOBILE', 'TABLET', 'DESKTOP']).optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      name: z.string().max(100).optional(),
    })
    .optional(),
})

/**
 * 買い物セッション開始リクエストの型
 */
export type StartShoppingSessionRequest = z.infer<typeof startShoppingSessionSchema>
