import { describe, it, expect } from 'vitest'
import {
  UserIdBuilder,
  EmailBuilder,
  UserProfileBuilder,
  UserStatusBuilder,
  NextAuthUserBuilder,
} from '../../../../../../__fixtures__/builders'

// テスト対象のUserエンティティクラス
import { User } from '@/modules/user-authentication/server/domain/entities/user.entity'

// 値オブジェクトのインポート
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'
import { UserProfile } from '@/modules/user-authentication/server/domain/value-objects/user-profile.vo'
import { UserPreferences } from '@/modules/user-authentication/server/domain/value-objects/user-preferences.vo'
import { UserStatus } from '@/modules/user-authentication/server/domain/value-objects/user-status.vo'

// テスト用ヘルパー関数
const createUserProfileFromBuilder = (builder: UserProfileBuilder) => {
  const data = builder.build()
  return new UserProfile({
    ...data,
    preferences: new UserPreferences(data.preferences),
  })
}

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
        status: new UserStatus(statusData.status as any),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        lastLoginAt: null,
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

      // Act（実行）
      const user = User.createFromNextAuth(nextAuthUser)

      // Assert（検証）
      expect(user.getNextAuthId()).toBe(nextAuthUser.id)
      expect(user.getEmail().getValue()).toBe(nextAuthUser.email)
      expect(user.isActive()).toBe(true)
      expect(user.getProfile().getDisplayName()).toBeDefined()
    })

    it('カスタムプロフィール付きでUserエンティティを作成できる', () => {
      // Arrange（準備）
      const nextAuthUser = new NextAuthUserBuilder().withTestUser().build()
      const customProfileData = new UserProfileBuilder()
        .withDisplayName('カスタム太郎')
        .withLanguage('en')
        .build()
      const customProfile = new UserProfile({
        ...customProfileData,
        preferences: new UserPreferences(customProfileData.preferences),
      })

      // Act（実行）
      const user = User.createFromNextAuthWithProfile(nextAuthUser, customProfile)

      // Assert（検証）
      expect(user.getNextAuthId()).toBe(nextAuthUser.id)
      expect(user.getProfile().getDisplayName()).toBe('カスタム太郎')
      expect(user.getProfile().getLanguage()).toBe('en')
    })
  })

  describe('不正な値での作成', () => {
    it('無効なnextAuthIdで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidUserData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: '', // 空文字
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act & Assert（実行 & 検証）
      expect(() => new User(invalidUserData)).toThrow('NextAuth IDは必須です')
    })

    it('nullまたはundefinedのプロパティで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const invalidUserData = {
        id: null as any,
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act & Assert（実行 & 検証）
      expect(() => new User(invalidUserData)).toThrow('ユーザーIDは必須です')
    })

    it('作成日時が更新日時より後の場合エラーが発生する', () => {
      // Arrange（準備）
      const invalidUserData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'), // 作成日より前
        lastLoginAt: null,
      }

      // Act & Assert（実行 & 検証）
      expect(() => new User(invalidUserData)).toThrow('更新日時は作成日時以降である必要があります')
    })
  })

  describe('ユーザーステータス管理', () => {
    it('アクティブなユーザーはログイン可能である', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user = new User(userData)

      // Assert（検証）
      expect(user.isActive()).toBe(true)
      expect(user.canLogin()).toBe(true)
    })

    it('無効化されたユーザーはログイン不可である', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user = new User(userData)

      // Assert（検証）
      expect(user.isActive()).toBe(false)
      expect(user.canLogin()).toBe(false)
    })

    it('ユーザーを無効化できる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user = new User(userData)
      user.deactivate()

      // Assert（検証）
      expect(user.isActive()).toBe(false)
      expect(user.canLogin()).toBe(false)
      expect(user.getStatus().isDeactivated()).toBe(true)
    })

    it('既に無効化されたユーザーの再無効化はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user = new User(userData)

      // Assert（検証）
      expect(() => user.deactivate()).toThrow('既に無効化されたユーザーです')
    })
  })

  describe('プロフィール管理', () => {
    it('プロフィールを更新できる', async () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      const newProfile = createUserProfileFromBuilder(
        new UserProfileBuilder().withDisplayName('更新された名前').withLanguage('en')
      )

      // Act（実行）
      const user = new User(userData)
      const originalUpdatedAt = user.getUpdatedAt()

      // 少し時間を待ってから更新
      const waitPromise = new Promise((resolve) => setTimeout(resolve, 10))
      await waitPromise

      // プロフィール更新
      user.updateProfile(newProfile)

      // Assert（検証）
      expect(user.getProfile().getDisplayName()).toBe('更新された名前')
      expect(user.getProfile().getLanguage()).toBe('en')
      expect(user.getUpdatedAt().getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('無効なプロフィールでの更新はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user = new User(userData)

      // Assert（検証）
      expect(() => user.updateProfile(null as any)).toThrow('プロフィールは必須です')
    })

    it('無効化されたユーザーのプロフィール更新はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      const newProfile = createUserProfileFromBuilder(
        new UserProfileBuilder().withDisplayName('更新された名前')
      )

      // Act（実行）
      const user = new User(userData)

      // Assert（検証）
      expect(() => user.updateProfile(newProfile)).toThrow(
        '無効化されたユーザーのプロフィールは更新できません'
      )
    })
  })

  describe('ログイン管理', () => {
    it('ログインを記録できる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      const loginTime = new Date()

      // Act（実行）
      const user = new User(userData)
      user.recordLogin(loginTime)

      // Assert（検証）
      expect(user.getLastLoginAt()).toEqual(loginTime)
    })

    it('無効化されたユーザーのログイン記録はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      const loginTime = new Date()

      // Act（実行）
      const user = new User(userData)

      // Assert（検証）
      expect(() => user.recordLogin(loginTime)).toThrow('無効化されたユーザーはログインできません')
    })
  })

  describe('NextAuth統合', () => {
    it('NextAuthユーザーと同期できる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      const updatedNextAuthUser = new NextAuthUserBuilder()
        .withId('next-auth-123')
        .withEmail('updated@example.com')
        .build()

      // Act（実行）
      const user = new User(userData)
      user.syncWithNextAuth(updatedNextAuthUser)

      // Assert（検証）
      expect(user.getEmail().getValue()).toBe('updated@example.com')
    })

    it('異なるNextAuthIdでの同期はエラーになる', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      const differentNextAuthUser = new NextAuthUserBuilder()
        .withId('different-id')
        .withEmail('different@example.com')
        .build()

      // Act（実行）
      const user = new User(userData)

      // Assert（検証）
      expect(() => user.syncWithNextAuth(differentNextAuthUser)).toThrow(
        'NextAuth IDが一致しません'
      )
    })
  })

  describe('等価性比較', () => {
    it('同じIDのUserエンティティは等しい', () => {
      // Arrange（準備）
      const userId = new UserId(new UserIdBuilder().build().value)
      const userData1 = {
        id: userId,
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }
      const userData2 = {
        id: userId, // 同じID
        nextAuthId: 'next-auth-456', // 異なるnextAuthId
        email: new Email(new EmailBuilder().withValue('different@example.com').build().value),
        profile: createUserProfileFromBuilder(
          new UserProfileBuilder().withDisplayName('異なる名前')
        ),
        status: UserStatus.createDeactivated(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user1 = new User(userData1)
      const user2 = new User(userData2)

      // Assert（検証）
      expect(user1.equals(user2)).toBe(true)
    })

    it('異なるIDのUserエンティティは等しくない', () => {
      // Arrange（準備）
      const userData1 = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }
      const userData2 = {
        id: new UserId(new UserIdBuilder().build().value), // 異なるID
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user1 = new User(userData1)
      const user2 = new User(userData2)

      // Assert（検証）
      expect(user1.equals(user2)).toBe(false)
    })

    it('User以外のオブジェクトとは等しくない', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user = new User(userData)
      const notUser = { id: userData.id }

      // Assert（検証）
      expect(user.equals(notUser as any)).toBe(false)
    })
  })

  describe('その他のメソッド', () => {
    it('recordLoginで時刻を指定しない場合は現在時刻が設定される', () => {
      // Arrange（準備）
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act（実行）
      const user = new User(userData)
      const beforeLogin = new Date()
      user.recordLogin()
      const afterLogin = new Date()

      // Assert（検証）
      const loginTime = user.getLastLoginAt()
      expect(loginTime).not.toBeNull()
      expect(loginTime!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime())
      expect(loginTime!.getTime()).toBeLessThanOrEqual(afterLogin.getTime())
    })

    it('syncWithNextAuthでメールアドレスが同じ場合は更新日時が変わらない', () => {
      // Arrange（準備）
      const originalEmail = 'test@example.com'
      const userData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(originalEmail),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: null,
      }

      const sameEmailNextAuthUser = new NextAuthUserBuilder()
        .withId('next-auth-123')
        .withEmail(originalEmail)
        .build()

      // Act（実行）
      const user = new User(userData)
      const originalUpdatedAt = user.getUpdatedAt()
      user.syncWithNextAuth(sameEmailNextAuthUser)

      // Assert（検証）
      expect(user.getEmail().getValue()).toBe(originalEmail)
      expect(user.getUpdatedAt()).toEqual(originalUpdatedAt)
    })

    it('必須プロパティがすべて検証される', () => {
      // emailがnullの場合
      const invalidData1 = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: null as any,
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }
      expect(() => new User(invalidData1)).toThrow('メールアドレスは必須です')

      // profileがnullの場合
      const invalidData2 = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: null as any,
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }
      expect(() => new User(invalidData2)).toThrow('プロフィールは必須です')

      // statusがnullの場合
      const invalidData3 = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }
      expect(() => new User(invalidData3)).toThrow('ユーザーステータスは必須です')

      // createdAtがnullの場合
      const invalidData4 = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: null as any,
        updatedAt: new Date(),
        lastLoginAt: null,
      }
      expect(() => new User(invalidData4)).toThrow('作成日時は必須です')

      // updatedAtがnullの場合
      const invalidData5 = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: 'next-auth-123',
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: null as any,
        lastLoginAt: null,
      }
      expect(() => new User(invalidData5)).toThrow('更新日時は必須です')
    })

    it('nextAuthIdがスペースのみの場合エラーになる', () => {
      // Arrange（準備）
      const invalidUserData = {
        id: new UserId(new UserIdBuilder().build().value),
        nextAuthId: '   ', // スペースのみ
        email: new Email(new EmailBuilder().withTestEmail().build().value),
        profile: createUserProfileFromBuilder(new UserProfileBuilder().withDefaults()),
        status: UserStatus.createActive(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      }

      // Act & Assert（実行 & 検証）
      expect(() => new User(invalidUserData)).toThrow('NextAuth IDは必須です')
    })
  })
})
