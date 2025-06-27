import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import EmailProvider from 'next-auth/providers/email'

import { prisma } from '@/lib/prisma'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

/**
 * NextAuth v5設定
 *
 * マジックリンク認証を使用し、ドメインユーザーとの連携を行う
 */

export const { auth, handlers, signIn, signOut } = NextAuth({
  // Prismaアダプターの設定
  adapter: PrismaAdapter(prisma as any),
  debug: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    EmailProvider({
      // MailHog用の設定（認証なし）
      server: `smtp://${process.env.EMAIL_SERVER_HOST || 'localhost'}:${
        process.env.EMAIL_SERVER_PORT || '1025'
      }`,
      from: process.env.EMAIL_FROM || 'noreply@example.com',
    }),
  ],
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ account }) {
      // マジックリンク認証時の処理
      if (account?.provider === 'email') {
        try {
          // ドメインユーザーとの連携処理はイベントで処理
          // TODO: ログ出力は本番環境では適切なロガーに置き換える
          return true
        } catch (_error) {
          // TODO: エラーログは本番環境では適切なロガーに置き換える
          return false
        }
      }
      return true
    },
    async session({ session, user }) {
      // セッションにドメインユーザー情報を追加
      if (session.user && user) {
        // NextAuthのユーザーIDをセッションに追加
        session.user.id = user.id

        // ドメインユーザーの情報を取得して追加（必要に応じて）
        try {
          const domainUser = await prisma.domainUser.findUnique({
            where: { nextAuthId: user.id },
          })

          if (domainUser) {
            session.user.domainUserId = domainUser.id
            session.user.status = domainUser.status
            session.user.displayName = domainUser.displayName
          }
        } catch (_error) {
          // TODO: エラーログは本番環境では適切なロガーに置き換える
        }
      }
      return session
    },
    async jwt({ token, user }) {
      // JWTトークンの処理
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  events: {
    async signIn(message) {
      // ユーザーログイン時のイベント処理
      const { user, account } = message

      if (user && account?.provider === 'email') {
        try {
          // ドメインユーザーとの連携処理
          // UserIntegrationServiceを使用してドメインユーザーを作成/更新
          const userRepository = new PrismaUserRepository(prisma)
          const userIntegrationService = new UserIntegrationService(userRepository)

          // NextAuthユーザーからドメインユーザーを作成または更新
          const nextAuthUser = {
            id: user.id!,
            email: user.email!,
            name: user.name || null,
            image: user.image || null,
            emailVerified: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          await userIntegrationService.createOrUpdateFromNextAuth(nextAuthUser)
        } catch (error) {
          // TODO: 本番環境では適切なロガーに置き換える
        }
      }
    },
    async createUser(_message) {
      // 新規ユーザー作成時のイベント処理
      // TODO: ユーザー作成ログは本番環境では適切なロガーに置き換える
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 24時間
  },
})

/**
 * NextAuthのセッション型を拡張
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      domainUserId?: string
      status?: string
      displayName?: string | null
    }
  }
}
