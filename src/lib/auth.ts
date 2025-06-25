import { NextAuthOptions, User as NextAuthUser } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import { prisma } from '@/lib/prisma'

/**
 * NextAuth設定
 * 
 * マジックリンク認証を使用し、ドメインユーザーとの連携を行う
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT ? parseInt(process.env.EMAIL_SERVER_PORT, 10) : 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // マジックリンク認証時の処理
      if (account?.provider === 'email') {
        try {
          // ドメインユーザーとの連携処理はイベントで処理
          console.log('User signing in:', user.email)
          return true
        } catch (error) {
          console.error('Error during sign in:', error)
          return false
        }
      }
      return true
    },
    async session({ session, user, token }) {
      // セッションにドメインユーザー情報を追加
      if (session.user && user) {
        // NextAuthのユーザーIDをセッションに追加
        session.user.id = user.id
        
        // ドメインユーザーの情報を取得して追加（必要に応じて）
        try {
          const domainUser = await prisma.domainUser.findUnique({
            where: { nextAuthId: user.id }
          })
          
          if (domainUser) {
            session.user.domainUserId = domainUser.id
            session.user.status = domainUser.status
            session.user.displayName = domainUser.displayName
          }
        } catch (error) {
          console.error('Error fetching domain user:', error)
        }
      }
      return session
    },
    async jwt({ token, user, account, profile, trigger, session }) {
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
      const { user, account, profile, isNewUser } = message
      
      if (user && account?.provider === 'email') {
        try {
          // ドメインユーザーとの連携処理
          // UserIntegrationServiceを使用してドメインユーザーを作成/更新
          console.log('SignIn event:', { userId: user.id, email: user.email, isNewUser })
          
          // TODO: ここでUserIntegrationServiceを呼び出す
          // const userIntegrationService = new UserIntegrationService(new PrismaUserRepository(prisma))
          // await userIntegrationService.createOrUpdateFromNextAuth(user)
        } catch (error) {
          console.error('Error in signIn event:', error)
        }
      }
    },
    async createUser(message) {
      // 新規ユーザー作成時のイベント処理
      console.log('User created:', message.user)
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 24時間
  },
  debug: process.env.NODE_ENV === 'development',
}

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