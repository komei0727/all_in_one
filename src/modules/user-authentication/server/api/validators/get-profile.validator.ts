import { z } from 'zod'

/**
 * プロフィール取得リクエストのバリデーションスキーマ
 * GETリクエストではボディがないため、空のオブジェクトで定義
 */
export const getProfileValidator = z.object({})

/**
 * プロフィール取得リクエストの型定義
 */
export type GetProfileRequest = z.infer<typeof getProfileValidator>
