import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { UserNotFoundException } from '../../domain/exceptions'
import { getProfileValidator } from '../validators/get-profile.validator'

import type { UserApplicationService } from '../../application/services/user-application.service'
import type { GetProfileRequest } from '../validators/get-profile.validator'

/**
 * プロフィール取得APIハンドラー
 * BaseApiHandlerを継承して統一的な例外変換とエラーハンドリングを提供
 */
export class GetProfileApiHandler extends BaseApiHandler<GetProfileRequest, unknown> {
  constructor(private readonly userApplicationService: UserApplicationService) {
    super()
  }

  /**
   * リクエストデータのバリデーション
   * GET リクエストなのでボディは空
   * @param data バリデーション対象のデータ
   * @returns バリデーション済みのリクエストデータ
   */
  validate(data: unknown): GetProfileRequest {
    return getProfileValidator.parse(data)
  }

  /**
   * プロフィール取得のビジネスロジックを実行
   * @param request バリデーション済みのリクエストデータ
   * @param userId 認証済みユーザーID（NextAuthID）
   * @returns ユーザープロフィール
   */
  async execute(request: GetProfileRequest, userId: string): Promise<unknown> {
    // NextAuthIDを使ってユーザープロフィールを取得
    const user = await this.userApplicationService.getUserByNextAuthId(userId)

    if (!user) {
      throw new UserNotFoundException(userId)
    }

    return user
  }
}
