'use client'

import { useState } from 'react'

import { Loader2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { CreateIngredientForm } from '@/modules/ingredients/client/components/create-ingredient-form'
import { IngredientsList } from '@/modules/ingredients/client/components/ingredients-list'
import { IngredientsListControls } from '@/modules/ingredients/client/components/ingredients-list-controls'
import {
  useIngredients,
  useCategories,
  type IngredientsParams,
} from '@/modules/ingredients/client/hooks/use-ingredients-api'

export default function IngredientsPage() {
  // 認証チェック
  const { data: session, status } = useSession()

  // 検索パラメータの状態管理
  const [params, setParams] = useState<IngredientsParams>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  // 食材一覧を取得
  const { data, isLoading, error, refetch } = useIngredients(params)

  // カテゴリー一覧を取得
  const { data: categories } = useCategories()

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session?.user?.domainUserId) {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">食材管理</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 食材登録フォーム */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">新規食材登録</h2>
            <CreateIngredientForm onSuccess={() => refetch()} />
          </div>
        </div>

        {/* 食材一覧 */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">登録済み食材</h2>

            {/* 検索・フィルター・ソート・ページネーション */}
            <IngredientsListControls
              categories={categories || []}
              currentParams={params}
              onParamsChange={setParams}
              totalPages={data?.pagination.totalPages || 1}
              currentPage={data?.pagination.page || 1}
              isLoading={isLoading}
            />

            {/* 食材リスト */}
            <div className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">食材の取得に失敗しました</div>
              ) : (
                <IngredientsList ingredients={data?.ingredients || []} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
