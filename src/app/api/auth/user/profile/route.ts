import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

/**
 * ユーザープロフィール取得 API
 * GET /api/auth/user/profile
 */
export async function GET(_request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'ログインが必要です',
        },
        { status: 401 }
      )
    }

    // サービス依存関係の構築
    const userRepository = new PrismaUserRepository(prisma)
    const userIntegrationService = new UserIntegrationService(userRepository)
    const userApplicationService = new UserApplicationService(userIntegrationService)

    // ユーザープロフィール取得
    const user = await userApplicationService.getUserByNextAuthId(session.user.id)

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'ユーザーが見つかりません',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user,
      message: 'プロフィールを取得しました',
    })
  } catch (error) {
    // エラーログは本番環境では適切なロガーに置き換える
    // console.error('Profile fetch error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'プロフィールの取得に失敗しました',
      },
      { status: 500 }
    )
  }
}

/**
 * ユーザープロフィール更新 API
 * PUT /api/auth/user/profile
 */
export async function PUT(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'ログインが必要です',
        },
        { status: 401 }
      )
    }

    // リクエストボディの解析
    let requestData
    try {
      requestData = await request.json()
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'リクエストボディが無効です',
        },
        { status: 400 }
      )
    }

    // サービス依存関係の構築
    const userRepository = new PrismaUserRepository(prisma)
    const userIntegrationService = new UserIntegrationService(userRepository)
    const userApplicationService = new UserApplicationService(userIntegrationService)

    // 現在のユーザー情報を取得
    const currentUser = await userApplicationService.getUserByNextAuthId(session.user.id)

    if (!currentUser) {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'ユーザーが見つかりません',
        },
        { status: 404 }
      )
    }

    // プロフィール更新
    const updatedUser = await userApplicationService.updateUserProfile(currentUser.id, {
      displayName: requestData.displayName,
      timezone: requestData.timezone,
      language: requestData.language,
    })

    return NextResponse.json({
      user: updatedUser,
      message: 'プロフィールが更新されました',
    })
  } catch (error) {
    // エラーログは本番環境では適切なロガーに置き換える
    // console.error('Profile update error:', error)

    // バリデーションエラーの場合
    if (
      (error instanceof Error && error.message.includes('必須')) ||
      (error instanceof Error && error.message.includes('無効')) ||
      (error instanceof Error && error.message.includes('サポート'))
    ) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'プロフィールの更新に失敗しました',
      },
      { status: 500 }
    )
  }
}
