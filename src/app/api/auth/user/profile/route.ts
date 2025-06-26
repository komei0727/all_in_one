import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ApiErrorHandler } from '@/modules/user-authentication/server/api/error-handler'
import { ProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/profile-handler'
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
    const session = await auth()

    if (!session?.user?.id) {
      return ApiErrorHandler.unauthorizedError()
    }

    // サービス依存関係の構築
    const userRepository = new PrismaUserRepository(prisma)
    const userIntegrationService = new UserIntegrationService(userRepository)
    const userApplicationService = new UserApplicationService(userIntegrationService)
    const profileApiHandler = new ProfileApiHandler(userApplicationService)

    // ユーザープロフィール取得
    const user = await profileApiHandler.getProfile(session.user.id)

    return NextResponse.json({
      user,
      message: 'プロフィールを取得しました',
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error)
  }
}

/**
 * ユーザープロフィール更新 API
 * PUT /api/auth/user/profile
 */
export async function PUT(request: NextRequest) {
  try {
    // セッション確認
    const session = await auth()

    if (!session?.user?.id) {
      return ApiErrorHandler.unauthorizedError()
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
    const profileApiHandler = new ProfileApiHandler(userApplicationService)

    // プロフィール更新
    const updatedUser = await profileApiHandler.updateProfile(session.user.id, requestData)

    return NextResponse.json({
      user: updatedUser,
      message: 'プロフィールが更新されました',
    })
  } catch (error) {
    return ApiErrorHandler.handleError(error)
  }
}
