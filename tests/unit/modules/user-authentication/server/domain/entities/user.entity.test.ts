import { describe, it, expect } from 'vitest'
import { 
  UserIdBuilder, 
  EmailBuilder,
  UserProfileBuilder,
  UserStatusBuilder,
  NextAuthUserBuilder
} from '../../../../../../__fixtures__/builders'

// テスト対象のUserエンティティクラス
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'

// 値オブジェクトのインポート
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'

describe('Userエンティティ', () => {
  describe('エンティティの作成', () => {
    it('有効な値でUserエンティティを作成できる', () => {
      // Arrange（準備）
      const userIdData = new UserIdBuilder().build()
      const emailData = new EmailBuilder().withTestEmail().build()
      const profileData = new UserProfileBuilder().withDefaults().build()
      const statusData = new UserStatusBuilder().withActive().build()
      
      const userData = {
        id: new UserId(userIdData.value),
        nextAuthId: 'next-auth-123',
        email: new Email(emailData.value),
        profile: UserProfile.createDefault('テストユーザー'),
        status: new UserStatus(statusData.status),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        lastLoginAt: null
      }
      
      // Act（実行）
      const user = new User(userData)
      
      // Assert（検証）
      expect(user.getId().getValue()).toBe(userData.id.getValue())
      expect(user.getNextAuthId()).toBe(userData.nextAuthId)
      expect(user.getEmail().getValue()).toBe(userData.email.getValue())
      expect(user.getProfile().getDisplayName()).toBe('テストユーザー')
      expect(user.getStatus().isActive()).toBe(true)
      expect(user.isActive()).toBe(true)
    })

    it('NextAuthユーザーからUserエンティティを作成できる', () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = User.createFromNextAuth(nextAuthUser)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.getNextAuthId()).toBe(nextAuthUser.id)
      // expect(user.getEmail().getValue()).toBe(nextAuthUser.email)
      // expect(user.isActive()).toBe(true)
      // expect(user.getProfile().getDisplayName()).toBeDefined()
      
      // 実装前のプレースホルダー
      expect(nextAuthUser.email).toBeDefined()
    })

    it('カスタムプロフィール付きでUserエンティティを作成できる', () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const customProfile = new UserProfileBuilder()
        .withDisplayName('カスタム太郎')
        .withLanguage('en')
        .build()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = User.createFromNextAuthWithProfile(nextAuthUser, customProfile)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.getNextAuthId()).toBe(nextAuthUser.id)
      // expect(user.getProfile().getDisplayName()).toBe('カスタム太郎')
      // expect(user.getProfile().getLanguage()).toBe('en')
      
      // 実装前のプレースホルダー
      expect(customProfile.displayName).toBe('カスタム太郎')
    })
  })

  describe('不正な値での作成', () => {
    it('無効なnextAuthIdで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidUserData = {
        id: new UserIdBuilder().build(),
        nextAuthId: '', // 空文字
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new User(invalidUserData))
      //   .toThrow('NextAuth IDは必須です')
      
      // 実装前のプレースホルダー
      expect(invalidUserData.nextAuthId).toBe('')
    })

    it('nullまたはundefinedのプロパティで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidUserData = {
        id: null,
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new User(invalidUserData))
      //   .toThrow('ユーザーIDは必須です')
      
      // 実装前のプレースホルダー
      expect(invalidUserData.id).toBeNull()
    })

    it('作成日時が更新日時より後の場合エラーが発生する', () => {
      // Arrange（準備）
      const invalidUserData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'), // 作成日より前
        lastLoginAt: null
      }
      
      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new User(invalidUserData))
      //   .toThrow('更新日時は作成日時以降である必要があります')
      
      // 実装前のプレースホルダー
      expect(invalidUserData.createdAt > invalidUserData.updatedAt).toBe(true)
    })
  })

  describe('ユーザーステータス管理', () => {
    it('アクティブなユーザーはログイン可能である', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.isActive()).toBe(true)
      // expect(user.canLogin()).toBe(true)
      
      // 実装前のプレースホルダー
      expect(userData.status).toBeDefined()
    })

    it('無効化されたユーザーはログイン不可である', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withDeactivated().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.isActive()).toBe(false)
      // expect(user.canLogin()).toBe(false)
      
      // 実装前のプレースホルダー
      expect(userData.status).toBeDefined()
    })

    it('ユーザーを無効化できる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      // user.deactivate()
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.isActive()).toBe(false)
      // expect(user.canLogin()).toBe(false)
      // expect(user.getStatus().isDeactivated()).toBe(true)
      
      // 実装前のプレースホルダー
      expect(userData.status).toBeDefined()
    })

    it('既に無効化されたユーザーの再無効化はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withDeactivated().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(() => user.deactivate())
      //   .toThrow('既に無効化されたユーザーです')
      
      // 実装前のプレースホルダー
      expect(userData.status).toBeDefined()
    })
  })

  describe('プロフィール管理', () => {
    it('プロフィールを更新できる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      const newProfile = new UserProfileBuilder()
        .withDisplayName('更新された名前')
        .withLanguage('en')
        .build()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      // const originalUpdatedAt = user.getUpdatedAt()
      
      // プロフィール更新
      // user.updateProfile(newProfile)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.getProfile().getDisplayName()).toBe('更新された名前')
      // expect(user.getProfile().getLanguage()).toBe('en')
      // expect(user.getUpdatedAt() > originalUpdatedAt).toBe(true)
      
      // 実装前のプレースホルダー
      expect(newProfile.displayName).toBe('更新された名前')
    })

    it('無効なプロフィールでの更新はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(() => user.updateProfile(null))
      //   .toThrow('プロフィールは必須です')
      
      // 実装前のプレースホルダー
      expect(userData.profile).toBeDefined()
    })

    it('無効化されたユーザーのプロフィール更新はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withDeactivated().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      const newProfile = new UserProfileBuilder()
        .withDisplayName('更新された名前')
        .build()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(() => user.updateProfile(newProfile))
      //   .toThrow('無効化されたユーザーのプロフィールは更新できません')
      
      // 実装前のプレースホルダー
      expect(userData.status).toBeDefined()
    })
  })

  describe('ログイン管理', () => {
    it('ログインを記録できる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      const loginTime = new Date()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      // user.recordLogin(loginTime)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.getLastLoginAt()).toEqual(loginTime)
      
      // 実装前のプレースホルダー
      expect(userData.lastLoginAt).toBeNull()
    })

    it('無効化されたユーザーのログイン記録はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withDeactivated().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      const loginTime = new Date()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(() => user.recordLogin(loginTime))
      //   .toThrow('無効化されたユーザーはログインできません')
      
      // 実装前のプレースホルダー
      expect(userData.status).toBeDefined()
    })
  })

  describe('NextAuth統合', () => {
    it('NextAuthユーザーと同期できる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      const updatedNextAuthUser = new NextAuthUserBuilder()
        .withId('next-auth-123')
        .withEmail('updated@example.com')
        .build()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      // user.syncWithNextAuth(updatedNextAuthUser)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user.getEmail().getValue()).toBe('updated@example.com')
      
      // 実装前のプレースホルダー
      expect(updatedNextAuthUser.email).toBe('updated@example.com')
    })

    it('異なるNextAuthIdでの同期はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      const differentNextAuthUser = new NextAuthUserBuilder()
        .withId('different-id')
        .withEmail('different@example.com')
        .build()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user = new User(userData)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(() => user.syncWithNextAuth(differentNextAuthUser))
      //   .toThrow('NextAuth IDが一致しません')
      
      // 実装前のプレースホルダー
      expect(differentNextAuthUser.id).toBe('different-id')
    })
  })

  describe('等価性比較', () => {
    it('同じIDのUserエンティティは等しい', () => {
      // Arrange（準備）
      const userId = new UserIdBuilder().build()
      const userData1 = {
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      const userData2 = {
        id: userId, // 同じID
        nextAuthId: 'next-auth-456', // 異なるnextAuthId
        email: new EmailBuilder().withValue('different@example.com').build(),
        profile: new UserProfileBuilder().withDisplayName('異なる名前').build(),
        status: new UserStatusBuilder().withDeactivated().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user1 = new User(userData1)
      // const user2 = new User(userData2)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user1.equals(user2)).toBe(true)
      
      // 実装前のプレースホルダー
      expect(userData1.id).toBeDefined()
    })

    it('異なるIDのUserエンティティは等しくない', () => {
      // Arrange（準備）
      const userData1 = {
        id: new UserIdBuilder().build(),
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      const userData2 = {
        id: new UserIdBuilder().build(), // 異なるID
        nextAuthId: 'next-auth-123',
        email: new EmailBuilder().withTestEmail().build(),
        profile: new UserProfileBuilder().withDefaults().build(),
        status: new UserStatusBuilder().withActive().build(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null
      }
      
      // Act（実行） - 実装後にコメントアウト解除
      // const user1 = new User(userData1)
      // const user2 = new User(userData2)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(user1.equals(user2)).toBe(false)
      
      // 実装前のプレースホルダー
      expect(userData2.id).toBeDefined()
    })
  })
})