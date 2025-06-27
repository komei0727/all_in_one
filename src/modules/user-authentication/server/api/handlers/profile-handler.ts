import {
  updateProfileSchema,
  type UpdateProfileRequest,
} from '../validators/profile-update.validator'

import type { UserApplicationService } from '../../application/services/user-application.service'

/**
 * プロフィールAPIハンドラー
 * HTTPリクエストを受け取り、アプリケーション層のサービスを呼び出す
 */
export class ProfileApiHandler {
  constructor(private readonly userApplicationService: UserApplicationService) {}

  /**
   * プロフィール取得リクエストを処理
   * @param nextAuthId NextAuth ID
   * @returns ユーザープロフィール
   * @throws {Error} ユーザーが見つからない場合
   */
  async getProfile(nextAuthId: string) {
    const user = await this.userApplicationService.getUserByNextAuthId(nextAuthId)

    if (!user) {
      throw new Error('ユーザーが見つかりません')
    }

    return user
  }

  /**
   * プロフィール更新リクエストを処理
   * @param nextAuthId NextAuth ID
   * @param request プロフィール更新リクエスト
   * @returns 更新されたユーザープロフィール
   * @throws {ZodError} バリデーションエラー
   * @throws {Error} ユーザーが見つからない場合
   */
  async updateProfile(nextAuthId: string, request: UpdateProfileRequest) {
    // リクエストのバリデーション
    const validatedRequest = updateProfileSchema.parse(request)

    // 現在のユーザー情報を取得
    const currentUser = await this.userApplicationService.getUserByNextAuthId(nextAuthId)

    if (!currentUser) {
      throw new Error('ユーザーが見つかりません')
    }

    // プロフィール更新
    return await this.userApplicationService.updateUserProfile(currentUser.id, {
      displayName: validatedRequest.displayName,
      timezone: validatedRequest.timezone,
      language: validatedRequest.language,
    })
  }
}
