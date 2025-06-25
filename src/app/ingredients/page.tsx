import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { CreateIngredientForm } from '@/modules/ingredients/client/components/create-ingredient-form'
import { IngredientsList } from '@/modules/ingredients/client/components/ingredients-list'

export const metadata: Metadata = {
  title: '食材管理',
  description: '食材の登録と管理',
}

export default async function IngredientsPage() {
  // 認証チェック
  const session = await getServerSession(authOptions)

  if (!session?.user?.domainUserId) {
    redirect('/auth/login')
  }

  // TODO: 食材一覧を取得する処理を実装
  const ingredients: never[] = []

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">食材管理</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 食材登録フォーム */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">新規食材登録</h2>
            <CreateIngredientForm />
          </div>
        </div>

        {/* 食材一覧 */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">登録済み食材</h2>
            <IngredientsList ingredients={ingredients} />
          </div>
        </div>
      </div>
    </div>
  )
}
