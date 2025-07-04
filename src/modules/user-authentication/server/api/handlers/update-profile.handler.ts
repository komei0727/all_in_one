import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { UserNotFoundException } from '../../domain/exceptions'
import { updateProfileSchema } from '../validators/profile-update.validator'

import type { UserApplicationService } from '../../application/services/user-application.service'
import type { UpdateProfileRequest } from '../validators/profile-update.validator'

/**
 * プロフィール更新APIハンドラー
 * BaseApiHandlerを継承して統一的な例外変換とエラーハンドリングを提供
 */
export class UpdateProfileApiHandler extends BaseApiHandler<UpdateProfileRequest, unknown> {
  constructor(private readonly userApplicationService: UserApplicationService) {
    super()
  }

  /**
   * リクエストデータのバリデーション
   * @param data バリデーション対象のデータ
   * @returns バリデーション済みのリクエストデータ
   */
  validate(data: unknown): UpdateProfileRequest {
    return updateProfileSchema.parse(data)
  }

  /**
   * プロフィール更新のビジネスロジックを実行
   * @param request バリデーション済みのリクエストデータ
   * @param userId 認証済みユーザーID（ドメインユーザーID）
   * @returns 更新されたユーザープロフィール
   */
  async execute(request: UpdateProfileRequest, userId: string): Promise<unknown> {
    // 現在のユーザー情報を取得
    const currentUser = await this.userApplicationService.getUserById(userId)

    if (!currentUser) {
      throw new UserNotFoundException(userId)
    }

    // プロフィール更新を実行
    return await this.userApplicationService.updateUserProfile(currentUser.id, {
      displayName: request.displayName,
      timezone: request.timezone,
      language: request.language,
    })
  }
}
