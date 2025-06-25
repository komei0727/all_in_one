'use client'

import { Suspense } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: '設定エラーが発生しました。',
    AccessDenied: 'アクセスが拒否されました。',
    Verification: 'リンクの有効期限が切れています。もう一度お試しください。',
    Default: '認証中にエラーが発生しました。',
  }

  const message = errorMessages[error || 'Default'] || errorMessages.Default

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">認証エラー</h2>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
          <div className="mt-6">
            <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  )
}
