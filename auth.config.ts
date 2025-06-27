/**
 * 環境別メールサーバー設定
 */
export function getEmailConfig() {
  const host = process.env.EMAIL_SERVER_HOST || 'localhost'
  const port = Number(process.env.EMAIL_SERVER_PORT || '1025')
  const user = process.env.EMAIL_SERVER_USER
  const pass = process.env.EMAIL_SERVER_PASSWORD
  const from = process.env.EMAIL_FROM || 'noreply@example.com'

  // 開発環境（MailHog）- 認証なし
  if (host === 'localhost' && port === 1025) {
    return {
      server: {
        host,
        port,
        secure: false,
        // MailHogは認証不要
        tls: {
          rejectUnauthorized: false,
        },
        // 認証を明示的に無効化
        auth: false as any,
      },
      from,
    }
  }

  // 本番/検証環境 - 認証あり
  return {
    server: {
      host,
      port,
      secure: port === 465, // 465の場合はSSL
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        // 自己署名証明書を許可（開発環境用）
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    },
    from,
  }
}

/**
 * NextAuth設定の環境別調整
 */
export function getAuthConfig() {
  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'

  return {
    // デバッグモードは開発環境と検証環境のみ
    debug: !isProduction,

    // セッション設定
    session: {
      strategy: 'database' as const,
      maxAge: isProduction ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 本番: 30日、その他: 1日
      updateAge: 24 * 60 * 60, // 24時間
    },

    // CSRFトークンの設定
    cookies: {
      sessionToken: {
        name: `${isProduction ? '__Secure-' : ''}next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax' as const,
          path: '/',
          secure: isProduction,
        },
      },
    },
  }
}
