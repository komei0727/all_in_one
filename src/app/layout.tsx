import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { Toaster } from '@/modules/shared/client/components/ui/toaster'

import './globals.css'
import { Providers } from './providers'

// 環境変数の検証は別ファイルで行う（layout.tsxでは行わない）

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
