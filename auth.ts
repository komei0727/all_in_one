import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import nodemailer from 'nodemailer'

import { prisma } from '@/lib/prisma'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

import { getAuthConfig, getEmailConfig } from './auth.config'

// 環境変数の検証をサーバー起動時に実行
import '@/lib/server/env-validation'

import type { Adapter } from 'next-auth/adapters'

/**
 * NextAuth v5設定
 *
 * マジックリンク認証を使用し、ドメインユーザーとの連携を行う
 */

// 環境別の設定を取得
const authConfig = getAuthConfig()
const emailConfig = getEmailConfig()

export const { auth, handlers, signIn, signOut } = NextAuth({
  // Prismaアダプターの設定
  adapter: PrismaAdapter(prisma) as Adapter,
  debug: authConfig.debug,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    EmailProvider({
      server: emailConfig.server,
      from: emailConfig.from,
      // メール送信設定
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        // Nodemailerトランスポーターの作成
        const transport = nodemailer.createTransport(provider.server)
        const result = await transport.sendMail({
          to: email,
          from: provider.from,
          subject: '食材管理アプリへのログイン',
          text: `以下のリンクをクリックしてログインしてください: ${url}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>食材管理アプリへのログイン</h2>
              <p>以下のボタンをクリックしてログインしてください。</p>
              <div style="margin: 30px 0;">
                <a href="${url}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  ログインする
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                このリンクは24時間有効です。心当たりがない場合は、このメールを無視してください。
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                ${process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? '' : '【検証環境】'}
                食材管理アプリ - ${process.env.NEXT_PUBLIC_APP_URL}
              </p>
            </div>
          `,
        })
        if (process.env.NODE_ENV === 'development') {
          console.warn('📧 認証メール送信:', { to: email, messageId: result.messageId })
        }
      },
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
        } catch (_error) {
          // TODO: 本番環境では適切なロガーに置き換える
        }
      }
    },
    async createUser(_message) {
      // 新規ユーザー作成時のイベント処理
      // TODO: ユーザー作成ログは本番環境では適切なロガーに置き換える
    },
  },
  session: authConfig.session,
  cookies: authConfig.cookies,
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
