import { handlers } from '@/auth'

/**
 * NextAuth.js v5 API Route Handler
 *
 * App Routerで動的セグメント[...nextauth]を使用して
 * 全ての認証関連リクエストを処理する
 */
export const { GET, POST } = handlers
