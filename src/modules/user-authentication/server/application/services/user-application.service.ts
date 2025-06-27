import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import type { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import type { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'

/**
 * NextAuthユーザー情報
 */
export interface NextAuthUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  emailVerified?: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * ユーザープロフィール更新リクエスト
 */
export interface UpdateUserProfileRequest {
  displayName: string
  timezone: string
  language: 'ja' | 'en'
}

/**
 * ユーザー情報のDTO
 */
export interface UserDTO {
  id: string
  nextAuthId: string
  email: string
  profile: {
    displayName: string
    timezone: string
    language: 'ja' | 'en'
    preferences: {
      theme: 'light' | 'dark' | 'auto'
      notifications: boolean
      emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never'
    }
  }
  status: 'ACTIVE' | 'DEACTIVATED'
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * ユーザーアプリケーションサービス
 *
 * ユーザー認証とプロフィール管理に関するアプリケーションロジックを提供します。
 * ドメインサービスのUserIntegrationServiceをラップし、
 * UI層に適したインターフェースを提供します。
 */
export class UserApplicationService {
  constructor(private readonly userIntegrationService: UserIntegrationService) {}

  /**
   * NextAuthユーザーからドメインユーザーを作成または更新
   */
  async createOrUpdateFromNextAuth(nextAuthUser: NextAuthUser): Promise<UserDTO> {
    // Convert to domain NextAuthUser type, ensuring optional fields are null not undefined
    const domainNextAuthUser = {
      ...nextAuthUser,
      emailVerified: nextAuthUser.emailVerified ?? null,
      name: nextAuthUser.name ?? null,
      image: nextAuthUser.image ?? null,
    }
    const user = await this.userIntegrationService.createOrUpdateFromNextAuth(domainNextAuthUser)
    return this.mapToDTO(user)
  }

  /**
   * 認証成功時の処理
   */
  async handleSuccessfulAuthentication(nextAuthId: string): Promise<UserDTO> {
    const user = await this.userIntegrationService.handleSuccessfulAuthentication(nextAuthId)
    return this.mapToDTO(user)
  }

  /**
   * ユーザープロフィールの更新
   */
  async updateUserProfile(userId: string, request: UpdateUserProfileRequest): Promise<UserDTO> {
    // バリデーション
    this.validateUpdateProfileRequest(request)

    const userIdVO = new UserId(userId)

    // 現在のユーザー情報を取得してプロフィールを構築
    const currentUser = await this.userIntegrationService.findUserById(userIdVO)
    if (!currentUser) {
      throw new Error('ユーザーが見つかりません')
    }

    const newProfile = new UserProfile({
      displayName: request.displayName,
      timezone: request.timezone,
      language: request.language,
      preferences: currentUser.getProfile().getPreferences(),
    })

    const updatedUser = await this.userIntegrationService.updateUserProfile(userIdVO, newProfile)
    return this.mapToDTO(updatedUser)
  }

  /**
   * ユーザーの無効化
   */
  async deactivateUser(userId: string): Promise<UserDTO> {
    const userIdVO = new UserId(userId)
    const deactivatedUser = await this.userIntegrationService.deactivateUser(
      userIdVO,
      'USER_REQUEST',
      userId
    )
    return this.mapToDTO(deactivatedUser)
  }

  /**
   * IDでユーザーを取得
   */
  async getUserById(userId: string): Promise<UserDTO | null> {
    const userIdVO = new UserId(userId)
    const user = await this.userIntegrationService.findUserById(userIdVO)
    return user ? this.mapToDTO(user) : null
  }

  /**
   * メールアドレスでユーザーを取得
   */
  async getUserByEmail(email: string): Promise<UserDTO | null> {
    const emailVO = new Email(email)
    const user = await this.userIntegrationService.findUserByEmail(emailVO)
    return user ? this.mapToDTO(user) : null
  }

  /**
   * NextAuthIDでユーザーを取得
   */
  async getUserByNextAuthId(nextAuthId: string): Promise<UserDTO | null> {
    const user = await this.userIntegrationService.findUserByNextAuthId(nextAuthId)
    return user ? this.mapToDTO(user) : null
  }

  /**
   * アクティブユーザーのリストを取得
   */
  async getActiveUsers(limit?: number, offset?: number): Promise<UserDTO[]> {
    const users = await this.userIntegrationService.getActiveUsers(limit, offset)
    return users.map((user) => this.mapToDTO(user))
  }

  /**
   * 期間内のアクティブユーザー数を取得
   */
  async getActiveUserCount(days: number): Promise<number> {
    return await this.userIntegrationService.getActiveUserCount(days)
  }

  /**
   * プロフィール更新リクエストのバリデーション
   */
  private validateUpdateProfileRequest(request: UpdateUserProfileRequest): void {
    if (!request.displayName || request.displayName.trim() === '') {
      throw new Error('表示名は必須です')
    }

    if (request.displayName.length > 100) {
      throw new Error('表示名は100文字以内で入力してください')
    }

    if (!['ja', 'en'].includes(request.language)) {
      throw new Error('サポートされていない言語です')
    }

    // タイムゾーンの基本的なバリデーション
    if (!request.timezone || request.timezone.trim() === '') {
      throw new Error('タイムゾーンは必須です')
    }
  }

  /**
   * ドメインエンティティをDTOにマッピング
   */
  private mapToDTO(user: User): UserDTO {
    return {
      id: user.getId().getValue(),
      nextAuthId: user.getNextAuthId(),
      email: user.getEmail().getValue(),
      profile: {
        displayName: user.getProfile().getDisplayName(),
        timezone: user.getProfile().getTimezone(),
        language: user.getProfile().getLanguage(),
        preferences: {
          theme: user.getProfile().getPreferences().getTheme(),
          notifications: user.getProfile().getPreferences().getNotifications(),
          emailFrequency: user.getProfile().getPreferences().getEmailFrequency(),
        },
      },
      status: user.getStatus().getValue(),
      isActive: user.isActive(),
      lastLoginAt: user.getLastLoginAt(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    }
  }
}
