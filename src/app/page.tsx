'use client'

import { useEffect } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession, signOut } from 'next-auth/react'

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
      <div className="flex min-h-screen items-center justify-center">
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">食材管理アプリ</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{session.user?.email}</span>
              <button
                onClick={() => void signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="mb-4 text-lg font-medium text-gray-900">ようこそ！</h2>
              <p className="mb-6 text-gray-600">
                認証に成功しました。これでAPIのテストができます。
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-md mb-2 font-medium text-gray-900">ユーザー情報</h3>
                  <div className="rounded bg-gray-50 p-4">
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
                  <h3 className="text-md mb-2 font-medium text-gray-900">機能</h3>
                  <div className="space-y-2">
                    <div>
                      <Link
                        href="/ingredients"
                        className="block text-indigo-600 hover:text-indigo-500"
                      >
                        食材管理 →
                      </Link>
                    </div>
                    <div>
                      <Link href="/profile" className="block text-indigo-600 hover:text-indigo-500">
                        プロフィール編集 →
                      </Link>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md mb-2 font-medium text-gray-900">APIテスト</h3>
                  <div className="space-y-2">
                    <div>
                      <Link
                        href="/api/auth/user/profile"
                        target="_blank"
                        className="block text-indigo-600 hover:text-indigo-500"
                      >
                        プロフィール取得API (JSON) →
                      </Link>
                    </div>
                    <div>
                      <Link
                        href="/api/v1/ingredients/categories"
                        target="_blank"
                        className="block text-indigo-600 hover:text-indigo-500"
                      >
                        カテゴリー一覧API (JSON) →
                      </Link>
                    </div>
                    <div>
                      <Link
                        href="/api/v1/ingredients/units"
                        target="_blank"
                        className="block text-indigo-600 hover:text-indigo-500"
                      >
                        単位一覧API (JSON) →
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
