'use client'

import { useState, useEffect } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

interface UserProfile {
  id: string
  email: string
  displayName: string | null
  timezone: string
  language: string
  status: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

interface ApiResponse<T> {
  data: T
  meta: {
    timestamp: string
    version: string
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // フォームの状態
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [language, setLanguage] = useState('')

  // 未認証の場合はログインページにリダイレクト
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/login')
    }
  }, [session, status, router])

  // プロフィールを取得
  useEffect(() => {
    if (!session) return

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/v1/users/me')

        if (response.ok) {
          const data = (await response.json()) as ApiResponse<UserProfile>
          setProfile(data.data)
          setDisplayName(data.data.displayName || '')
          setTimezone(data.data.timezone)
          setLanguage(data.data.language)
        } else {
          const errorData = (await response.json()) as { error: { message: string } }
          setError(errorData.error.message || 'プロフィールの取得に失敗しました')
        }
      } catch (_error) {
        setError('プロフィールの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchProfile()
  }, [session])

  // プロフィールを更新
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          timezone,
          language,
        }),
      })

      if (response.ok) {
        const data = (await response.json()) as ApiResponse<UserProfile>
        setProfile(data.data)
        setSuccess('プロフィールが更新されました')
      } else {
        const errorData = (await response.json()) as { error: { message: string } }
        setError(errorData.error.message || 'プロフィールの更新に失敗しました')
      }
    } catch (_error) {
      setError('プロフィールの更新に失敗しました')
    } finally {
      setIsUpdating(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-semibold">
                食材管理アプリ
              </Link>
            </div>
            <div className="flex items-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="mb-6 text-lg font-medium text-gray-900">プロフィール設定</h2>

              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <form onSubmit={(e) => void handleUpdate(e)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    メールアドレス（変更不可）
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email}
                    disabled
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 shadow-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                    表示名
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="山田太郎"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                    言語
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                    タイムゾーン
                  </label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                  >
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                  </select>
                </div>

                <div className="pt-5">
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? '更新中...' : '更新'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="mb-4 text-sm font-medium text-gray-900">システム情報</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ユーザーID</dt>
                    <dd className="font-mono text-sm text-gray-900">{profile.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                    <dd className="text-sm text-gray-900">{profile.status}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(profile.createdAt).toLocaleString('ja-JP')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">最終ログイン</dt>
                    <dd className="text-sm text-gray-900">
                      {profile.lastLoginAt
                        ? new Date(profile.lastLoginAt).toLocaleString('ja-JP')
                        : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
