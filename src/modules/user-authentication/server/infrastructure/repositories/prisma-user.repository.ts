import { PrismaClient } from '@/generated/prisma'
import { UserRepository } from '@/modules/user-authentication/server/domain/repositories/user.repository'
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'

/**
 * Prismaクライアントを使用したUserRepositoryの実装
 * 
 * NextAuthのUserテーブルとドメインのDomainUserテーブルを連携して
 * ドメインモデルのUserエンティティを永続化する
 */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient | any) {}

  /**
   * ユーザーをIDで検索
   */
  async findById(id: UserId): Promise<User | null> {
    const domainUser = await this.prisma.domainUser.findUnique({
      where: { id: id.getValue() },
      include: {
        nextAuthUser: true
      }
    })

    if (!domainUser) {
      return null
    }

    return this.mapToDomainEntity(domainUser)
  }

  /**
   * NextAuthIDでユーザーを検索
   */
  async findByNextAuthId(nextAuthId: string): Promise<User | null> {
    const domainUser = await this.prisma.domainUser.findUnique({
      where: { nextAuthId },
      include: {
        nextAuthUser: true
      }
    })

    if (!domainUser) {
      return null
    }

    return this.mapToDomainEntity(domainUser)
  }

  /**
   * メールアドレスでユーザーを検索
   */
  async findByEmail(email: Email): Promise<User | null> {
    const domainUser = await this.prisma.domainUser.findUnique({
      where: { email: email.getValue() },
      include: {
        nextAuthUser: true
      }
    })

    if (!domainUser) {
      return null
    }

    return this.mapToDomainEntity(domainUser)
  }

  /**
   * ユーザーを保存（新規作成または更新）
   */
  async save(user: User): Promise<User> {
    const userData = {
      nextAuthId: user.getNextAuthId(),
      email: user.getEmail().getValue(),
      displayName: user.getProfile().getDisplayName(),
      preferredLanguage: user.getProfile().getLanguage(),
      timezone: user.getProfile().getTimezone(),
      status: user.getStatus().getValue(),
      lastLoginAt: user.getLastLoginAt(),
      updatedAt: new Date()
    }

    // 既存ユーザーかどうかを確認
    const existingUser = await this.prisma.domainUser.findUnique({
      where: { id: user.getId().getValue() }
    })

    let savedUser
    if (existingUser) {
      // 更新
      savedUser = await this.prisma.domainUser.update({
        where: { id: user.getId().getValue() },
        data: userData,
        include: {
          nextAuthUser: true
        }
      })
    } else {
      // 新規作成
      savedUser = await this.prisma.domainUser.create({
        data: {
          id: user.getId().getValue(),
          ...userData,
          createdAt: user.getCreatedAt()
        },
        include: {
          nextAuthUser: true
        }
      })
    }

    return this.mapToDomainEntity(savedUser)
  }

  /**
   * ユーザーを削除
   */
  async delete(id: UserId): Promise<boolean> {
    try {
      await this.prisma.domainUser.delete({
        where: { id: id.getValue() }
      })
      return true
    } catch (error) {
      // レコードが存在しない場合
      return false
    }
  }

  /**
   * アクティブユーザーのリストを取得
   */
  async findActiveUsers(limit?: number, offset?: number): Promise<User[]> {
    const domainUsers = await this.prisma.domainUser.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        nextAuthUser: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    return domainUsers.map((user: any) => this.mapToDomainEntity(user))
  }

  /**
   * NextAuthIDでユーザーの存在を確認
   */
  async existsByNextAuthId(nextAuthId: string): Promise<boolean> {
    const count = await this.prisma.domainUser.count({
      where: { nextAuthId }
    })
    return count > 0
  }

  /**
   * メールアドレスでユーザーの存在を確認
   */
  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.domainUser.count({
      where: { email: email.getValue() }
    })
    return count > 0
  }

  /**
   * 指定した期間内にアクティビティがあるアクティブユーザー数を取得
   */
  async countActiveUsersInPeriod(days: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return await this.prisma.domainUser.count({
      where: {
        status: 'ACTIVE',
        lastLoginAt: {
          gte: cutoffDate
        }
      }
    })
  }

  /**
   * Prismaの結果をドメインエンティティにマッピング
   */
  private mapToDomainEntity(prismaUser: any): User {
    // UserPreferencesを構築（デフォルト値を使用）
    const preferences = UserPreferences.createDefault()

    // UserProfileを構築
    const profile = new UserProfile({
      displayName: prismaUser.displayName || prismaUser.nextAuthUser.name || '',
      timezone: prismaUser.timezone,
      language: prismaUser.preferredLanguage as 'ja' | 'en',
      preferences
    })

    // UserStatusを構築
    const status = prismaUser.status === 'ACTIVE' 
      ? UserStatus.createActive() 
      : UserStatus.createDeactivated()

    // Userエンティティを構築
    return new User({
      id: new UserId(prismaUser.id),
      nextAuthId: prismaUser.nextAuthId,
      email: new Email(prismaUser.email),
      profile,
      status,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt
    })
  }
}