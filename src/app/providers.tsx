'use client'

import { useState } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClientをstateで管理することで、各リクエストで新しいインスタンスを作成
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 開発環境ではリトライを少なくして開発しやすくする
            retry: process.env.NODE_ENV === 'production' ? 3 : 1,
            staleTime: 60 * 1000, // 1分間はデータを新鮮とみなす
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  )
}
