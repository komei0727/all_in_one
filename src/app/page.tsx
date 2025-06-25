'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // 未認証の場合はログインページにリダイレクト
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/login')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">食材管理アプリ</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                ようこそ！
              </h2>
              <p className="text-gray-600 mb-6">
                認証に成功しました。これでAPIのテストができます。
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">
                    ユーザー情報
                  </h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                        <dd className="text-sm text-gray-900">{session.user?.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">ユーザーID</dt>
                        <dd className="text-sm text-gray-900">{session.user?.id}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">
                    APIテスト
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <Link
                        href="/api/auth/user/profile"
                        target="_blank"
                        className="text-indigo-600 hover:text-indigo-500 block"
                      >
                        プロフィール取得API (JSON) →
                      </Link>
                    </div>
                    <div>
                      <Link
                        href="/profile"
                        className="text-indigo-600 hover:text-indigo-500 block"
                      >
                        プロフィール編集ページ →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}