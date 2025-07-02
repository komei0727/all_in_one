import { z } from 'zod'

/**
 * CompleteShoppingSessionリクエストのバリデータ
 */
export const completeShoppingSessionValidator = z.object({
  sessionId: z.string().regex(/^ses_[a-z0-9]{24}$/, 'Invalid session ID format'),
})
