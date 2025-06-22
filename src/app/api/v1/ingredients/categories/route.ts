import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma/client'
import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'

/**
 * GET /api/v1/ingredients/categories
 *
 * カテゴリー一覧を取得するAPIエンドポイント
 * 4層アーキテクチャに従い、API層→Application層→Domain層の流れで処理
 */
export async function GET(_request: NextRequest) {
  try {
    // Infrastructure層のリポジトリを生成
    const categoryRepository = new PrismaCategoryRepository(prisma)

    // Application層のクエリハンドラーを生成
    const queryHandler = new GetCategoriesQueryHandler(categoryRepository)

    // クエリを実行
    const result = await queryHandler.execute()

    // HTTPレスポンスとして返却
    return NextResponse.json(result)
  } catch (error) {
    // エラーハンドリング

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
