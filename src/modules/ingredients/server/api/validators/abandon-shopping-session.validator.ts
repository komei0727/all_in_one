import { z } from 'zod'

/**
 * AbandonShoppingSessionリクエストのバリデータ
 */
export const abandonShoppingSessionValidator = z.object({
  sessionId: z.string().regex(/^ses_[a-zA-Z0-9]{20,30}$/, 'Invalid session ID format'),
  reason: z.string().optional(), // 中断理由（オプション）
})

/**
 * AbandonShoppingSessionリクエストの型定義
 */
export type AbandonShoppingSessionRequest = z.infer<typeof abandonShoppingSessionValidator>
