import type { Metadata } from 'next'

import { Inter } from 'next/font/google'

import { Toaster } from '@/modules/shared/client/components/ui/toaster'

import './globals.css'
import { Providers } from './providers'

// サーバーサイドでのみ環境変数を検証
if (typeof window === 'undefined') {
  void import('@/lib/env').then(({ validateEnv }) => {
    try {
      validateEnv()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Environment validation failed:', error)
      // 本番環境では起動を停止
      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      }
    }
  })
}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '食材管理アプリ',
  description: '一人暮らしのための食材管理アプリケーション',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
