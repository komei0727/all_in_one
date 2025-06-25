import NextAuth from 'next-auth'

import { authOptions } from '@/lib/auth'

/**
 * NextAuth.js API Route Handler
 *
 * App Routerで動的セグメント[...nextauth]を使用して
 * 全ての認証関連リクエストを処理する
 */
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
