import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { PUT } from '@/app/api/v1/ingredients/[id]/route'
import { auth } from '@/auth'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UpdateIngredientCommandBuilder, testDataHelpers } from '@tests/__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
  createTestUser,
} from '@tests/helpers/database.helper'

// authモジュールをモック
vi.mock('@/auth')

/**
 * テスト用認証ユーザーのモックを設定
 */
function mockAuthUser(user?: { nextAuthId?: string; domainUserId?: string; email?: string }) {
  const testDataIds = getTestDataIds()
  const { defaultUser } = testDataIds.users

  vi.mocked(auth).mockResolvedValue({
    user: {
      id: user?.nextAuthId || defaultUser.nextAuthId,
      email: user?.email || defaultUser.email,
      domainUserId: user?.domainUserId || defaultUser.domainUserId,
    },
  } as any)

  return user?.domainUserId || defaultUser.domainUserId
}

/**
 * PUT /api/v1/ingredients/{id} APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('PUT /api/v1/ingredients/{id} Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // CompositionRootをリセットして、テスト用のPrismaクライアントを使用
    CompositionRoot.resetInstance()
    CompositionRoot.getInstance(prisma as any)

    // 認証モックのリセット
    vi.mocked(auth).mockReset()
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()

    // CompositionRootをリセット
    CompositionRoot.resetInstance()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    describe('基本的な更新', () => {
      it('TC001: 全フィールドの更新', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 既存の食材を作成
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '元の食材名',
            categoryId: testDataIds.categories.vegetable,
            memo: '元のメモ',
            price: 100,
            purchaseDate: new Date('2024-01-01'),
            quantity: 5,
            unitId: testDataIds.units.piece,
            threshold: 2,
            storageLocationType: 'REFRIGERATED',
            storageLocationDetail: '野菜室',
            bestBeforeDate: new Date('2024-01-07'),
            useByDate: new Date('2024-01-05'),
          },
        })

        // When: 全フィールドを更新
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withName('更新された食材名')
          .withCategoryId(testDataIds.categories.meatFish)
          .withMemo('更新されたメモ')
          .withPrice(200)
          .withPurchaseDate('2024-01-02')
          .withExpiryInfo({
            bestBeforeDate: '2024-01-10',
            useByDate: '2024-01-08',
          })
          .withStock({
            quantity: 10,
            unitId: testDataIds.units.gram,
            storageLocation: {
              type: 'FROZEN',
              detail: '冷凍庫上段',
            },
            threshold: 5,
          })
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        // When: APIを呼び出す
        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: 200 OKが返される
        expect(response.status).toBe(200)
        expect(data.data.ingredient).toBeDefined()
        expect(data.data.ingredient.id).toBe(originalIngredient.id)
        expect(data.data.ingredient.name).toBe('更新された食材名')
        expect(data.data.ingredient.category.id).toBe(testDataIds.categories.meatFish)
        expect(data.data.ingredient.memo).toBe('更新されたメモ')
        expect(data.data.ingredient.price).toBe(200)
        expect(data.data.ingredient.stock.quantity).toBe(10)
        expect(data.data.ingredient.stock.unit.id).toBe(testDataIds.units.gram)
        expect(data.data.ingredient.stock.storageLocation.type).toBe('FROZEN')
        expect(data.data.ingredient.stock.storageLocation.detail).toBe('冷凍庫上段')
        expect(data.data.ingredient.stock.threshold).toBe(5)
        expect(data.data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        expect(data.data.ingredient.expiryInfo.useByDate).toBeDefined()

        // データベースに更新されていることを確認
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: originalIngredient.id },
        })
        expect(dbIngredient).toBeDefined()
        expect(dbIngredient?.name).toBe('更新された食材名')
        expect(dbIngredient?.categoryId).toBe(testDataIds.categories.meatFish)
        expect(dbIngredient?.memo).toBe('更新されたメモ')
        expect(dbIngredient?.price?.toNumber()).toBe(200)
        expect(dbIngredient?.quantity).toBe(10)
        expect(dbIngredient?.unitId).toBe(testDataIds.units.gram)
        expect(dbIngredient?.threshold).toBe(5)
        expect(dbIngredient?.storageLocationType).toBe('FROZEN')
        expect(dbIngredient?.storageLocationDetail).toBe('冷凍庫上段')
        expect(dbIngredient?.bestBeforeDate).toBeDefined()
        expect(dbIngredient?.useByDate).toBeDefined()
      })

      it('TC002: 部分的な更新 - 名前のみの変更', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 既存の食材を作成
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '元の食材名',
            categoryId: testDataIds.categories.vegetable,
            memo: '元のメモ',
            price: 100,
            purchaseDate: new Date('2024-01-01'),
            quantity: 5,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
        })

        // When: 名前のみを更新
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withNameOnly('新しい食材名')
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: 名前のみが更新され、他のフィールドは変更されない
        expect(response.status).toBe(200)
        expect(data.data.ingredient.name).toBe('新しい食材名')
        expect(data.data.ingredient.category.id).toBe(testDataIds.categories.vegetable) // 変更されていない
        expect(data.data.ingredient.memo).toBe('元のメモ') // 変更されていない
        expect(data.data.ingredient.price).toBe(100) // 変更されていない

        // データベースでも確認
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: originalIngredient.id },
        })
        expect(dbIngredient?.name).toBe('新しい食材名')
        expect(dbIngredient?.categoryId).toBe(testDataIds.categories.vegetable)
        expect(dbIngredient?.memo).toBe('元のメモ')
        expect(dbIngredient?.price?.toNumber()).toBe(100)
      })

      it('TC003: カテゴリー・単位の変更', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 野菜カテゴリーの食材（個単位）
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '鶏肉',
            categoryId: testDataIds.categories.vegetable, // 間違ったカテゴリー
            quantity: 1,
            unitId: testDataIds.units.piece, // 間違った単位
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
          },
        })

        // When: 肉・魚カテゴリー、グラム単位に変更
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withCategoryId(testDataIds.categories.meatFish)
          .withQuantityAndUnit(500, testDataIds.units.gram)
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: カテゴリーと単位が正しく更新される
        expect(response.status).toBe(200)
        expect(data.data.ingredient.category.id).toBe(testDataIds.categories.meatFish)
        expect(data.data.ingredient.category.name).toBe('肉・魚')
        expect(data.data.ingredient.stock.quantity).toBe(500)
        expect(data.data.ingredient.stock.unit.id).toBe(testDataIds.units.gram)
        expect(data.data.ingredient.stock.unit.name).toBe('グラム')
        expect(data.data.ingredient.stock.unit.symbol).toBe('g')
      })
    })

    describe('期限情報の更新パターン', () => {
      it('TC004: 期限情報の追加', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 期限情報がない食材
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '期限なし食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            // bestBeforeDate, useByDateはnull
          },
        })

        // When: 期限情報を追加
        const bestBeforeDate = '2024-01-10'
        const useByDate = '2024-01-07'
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withExpiryInfo({
            bestBeforeDate,
            useByDate,
          })
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: 期限情報が追加される
        expect(response.status).toBe(200)
        expect(data.data.ingredient.expiryInfo).toBeDefined()
        expect(data.data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        expect(data.data.ingredient.expiryInfo.useByDate).toBeDefined()

        // データベースでも確認
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: originalIngredient.id },
        })
        expect(dbIngredient?.bestBeforeDate).toBeDefined()
        expect(dbIngredient?.useByDate).toBeDefined()
      })

      it('TC005: 期限情報の削除', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 期限情報がある食材
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '期限あり食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: new Date('2024-01-10'),
            useByDate: new Date('2024-01-07'),
          },
        })

        // When: 期限情報を削除（nullに設定）
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withExpiryInfo(null)
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: 期限情報が削除される
        expect(response.status).toBe(200)
        expect(data.data.ingredient.expiryInfo).toBeNull()

        // データベースでも確認
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: originalIngredient.id },
        })
        expect(dbIngredient?.bestBeforeDate).toBeNull()
        expect(dbIngredient?.useByDate).toBeNull()
      })

      it('TC006: 期限情報の変更', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 期限情報がある食材
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '期限変更食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: new Date('2024-01-10'),
            useByDate: new Date('2024-01-07'),
          },
        })

        // When: 期限情報を変更（消費期限 ≤ 賞味期限の制約を守る）
        const newBestBeforeDate = '2024-01-15'
        const newUseByDate = '2024-01-12' // 賞味期限より前
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withExpiryInfo({
            bestBeforeDate: newBestBeforeDate,
            useByDate: newUseByDate,
          })
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: 期限情報が正しく更新される
        expect(response.status).toBe(200)
        expect(data.data.ingredient.expiryInfo.bestBeforeDate).toBeDefined()
        expect(data.data.ingredient.expiryInfo.useByDate).toBeDefined()

        // 制約が守られているか確認
        const bestBefore = new Date(data.data.ingredient.expiryInfo.bestBeforeDate)
        const useBy = new Date(data.data.ingredient.expiryInfo.useByDate)
        expect(useBy.getTime()).toBeLessThanOrEqual(bestBefore.getTime())
      })
    })

    describe('在庫情報の更新', () => {
      it('TC007: 数量・単位の変更', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 既存の食材（個単位）
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: 'バター',
            categoryId: testDataIds.categories.vegetable,
            quantity: 2, // 2個
            unitId: testDataIds.units.piece,
            threshold: 1,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
          },
        })

        // When: グラム単位に変更し、数量と閾値も更新
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withQuantityAndUnit(200, testDataIds.units.gram)
          .withThreshold(50)
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: 数量・単位・閾値が正しく更新される
        expect(response.status).toBe(200)
        expect(data.data.ingredient.stock.quantity).toBe(200)
        expect(data.data.ingredient.stock.unit.id).toBe(testDataIds.units.gram)
        expect(data.data.ingredient.stock.unit.symbol).toBe('g')
        expect(data.data.ingredient.stock.threshold).toBe(50)

        // データベースでも確認
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: originalIngredient.id },
        })
        expect(dbIngredient?.quantity).toBe(200)
        expect(dbIngredient?.unitId).toBe(testDataIds.units.gram)
        expect(dbIngredient?.threshold).toBe(50)
      })

      it('TC008: 保存場所の変更', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 冷蔵保存の食材
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '冷凍対象食材',
            categoryId: testDataIds.categories.meatFish,
            quantity: 500,
            unitId: testDataIds.units.gram,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            storageLocationDetail: '野菜室',
          },
        })

        // When: 冷凍保存に変更（既存のquantityとunitIdを保持）
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withStock({
            quantity: originalIngredient.quantity,
            unitId: originalIngredient.unitId,
            storageLocation: {
              type: StorageType.FROZEN,
              detail: '冷凍庫下段',
            },
            threshold: null,
          })
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Debug: エラー詳細を確認
        if (response.status !== 200) {
          console.log('TC008 Error Status:', response.status)
          console.log('TC008 Error Data:', JSON.stringify(data, null, 2))
        }

        // Then: 保存場所が正しく更新される
        expect(response.status).toBe(200)
        expect(data.data.ingredient.stock.storageLocation.type).toBe('FROZEN')
        expect(data.data.ingredient.stock.storageLocation.detail).toBe('冷凍庫下段')

        // データベースでも確認
        const dbIngredient = await prisma.ingredient.findUnique({
          where: { id: originalIngredient.id },
        })
        expect(dbIngredient?.storageLocationType).toBe('FROZEN')
        expect(dbIngredient?.storageLocationDetail).toBe('冷凍庫下段')
      })
    })
  })

  describe('異常系', () => {
    describe('リソース不存在', () => {
      it('TC101: 存在しない食材ID（404エラー）', async () => {
        // 認証済みユーザーのモック設定
        mockAuthUser()

        // Given: 存在しない食材ID
        const nonExistentId = testDataHelpers.ingredientId()
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(nonExistentId)
          .withNameOnly('存在しない食材')
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${nonExistentId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        // When: APIを呼び出す
        const response = await PUT(request, { params: Promise.resolve({ id: nonExistentId }) })
        const data = await response.json()

        // Then: 404 Not Foundが返される
        expect(response.status).toBe(404)
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
      })

      it('TC102: 他ユーザーの食材（404エラー）', async () => {
        // Given: 他のユーザーの食材を作成
        const otherUser = await createTestUser({ email: 'other@example.com' })
        const testDataIds = getTestDataIds()
        const otherUserIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: otherUser.domainUserId,
            name: '他ユーザーの食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
          },
        })

        // 現在のユーザーでアクセス
        const currentUser = mockAuthUser()
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(otherUserIngredient.id)
          .withUserId(currentUser)
          .withNameOnly('不正アクセス')
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${otherUserIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        // When: APIを呼び出す
        const response = await PUT(request, {
          params: Promise.resolve({ id: otherUserIngredient.id }),
        })
        const data = await response.json()

        // Then: 404 Not Found（プライバシー保護のため403ではなく404）
        expect(response.status).toBe(404)
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
      })

      it('TC103: 論理削除された食材（404エラー）', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 論理削除された食材
        const testDataIds = getTestDataIds()
        const deletedIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '削除済み食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            deletedAt: new Date(), // 論理削除済み
          },
        })

        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(deletedIngredient.id)
          .withUserId(testUserId)
          .withNameOnly('削除済み更新')
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${deletedIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        // When: APIを呼び出す
        const response = await PUT(request, {
          params: Promise.resolve({ id: deletedIngredient.id }),
        })
        const data = await response.json()

        // Then: 404 Not Found
        expect(response.status).toBe(404)
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
      })
    })

    describe('バリデーションエラー', () => {
      it('TC201: 必須フィールドエラー（400エラー）', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 既存の食材
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '元の食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
          },
        })

        // When: 名前を空文字で更新
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withName('') // 空文字
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Debug: エラー詳細を確認
        console.log('TC201 Error Data:', JSON.stringify(data, null, 2))

        // Then: 400 Bad Requestが返される
        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        // エラーメッセージかdetailsに「食材名」が含まれることを確認
        const hasIngredientNameError =
          data.error.message.includes('食材名') ||
          data.error.details?.validationErrors?.some(
            (err: any) => err.message?.includes('食材名') || err.field === 'name'
          )
        expect(hasIngredientNameError).toBe(true)
      })

      it('TC202: 制約違反（400エラー）', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 既存の食材
        const testDataIds = getTestDataIds()
        const originalIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '制約テスト食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
          },
        })

        // When: 消費期限 > 賞味期限の制約違反
        const useByDate = '2024-01-10'
        const bestBeforeDate = '2024-01-05' // 消費期限より前（制約違反）
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(originalIngredient.id)
          .withUserId(testUserId)
          .withExpiryInfo({
            bestBeforeDate,
            useByDate,
          })
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${originalIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: originalIngredient.id }),
        })
        const data = await response.json()

        // Then: 400 Bad Requestが返される
        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain('期限')
      })
    })

    describe('ビジネスルール違反', () => {
      it('TC301: 更新後の重複チェック（409エラー）', async () => {
        // 認証済みユーザーのモック設定
        const testUserId = mockAuthUser()

        // Given: 既存の2つの食材
        const testDataIds = getTestDataIds()
        const _existingIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '既存食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 5,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
          },
        })

        const targetIngredient = await prisma.ingredient.create({
          data: {
            id: testDataHelpers.ingredientId(),
            userId: testUserId,
            name: '更新対象食材',
            categoryId: testDataIds.categories.vegetable,
            quantity: 3,
            unitId: testDataIds.units.piece,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
          },
        })

        // When: 既存の食材名に変更（重複）
        const updateCommand = new UpdateIngredientCommandBuilder()
          .withId(targetIngredient.id)
          .withUserId(testUserId)
          .withName('既存食材') // 重複する名前
          .build()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/ingredients/${targetIngredient.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateCommand),
          }
        )

        const response = await PUT(request, {
          params: Promise.resolve({ id: targetIngredient.id }),
        })
        const data = await response.json()

        // Then: 422 Unprocessable Entityが返される（重複エラー）
        expect(response.status).toBe(422)
        expect(data.error.code).toBe('BUSINESS_RULE_VIOLATION')
        expect(data.error.message).toContain('同じ名前・期限・保存場所の食材が既に存在')
      })
    })
  })

  describe('認証・認可', () => {
    it('TC401: 認証されていない場合401エラーを返す', async () => {
      // 認証なしのモック
      vi.mocked(auth).mockResolvedValue(null as any)

      // Given: 有効な更新データ
      const ingredientId = testDataHelpers.ingredientId()
      const updateCommand = new UpdateIngredientCommandBuilder()
        .withId(ingredientId)
        .withNameOnly('認証テスト')
        .build()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateCommand),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: Promise.resolve({ id: ingredientId }) })
      const data = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toContain('Authentication required')
    })

    it('TC402: 無効なトークン（401エラー）', async () => {
      // 不正なトークンのモック
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'invalid-user-id',
          email: faker.internet.email(),
          // domainUserIdがない
        },
      } as any)

      // Given: 有効な更新データ
      const ingredientId = testDataHelpers.ingredientId()
      const updateCommand = new UpdateIngredientCommandBuilder()
        .withId(ingredientId)
        .withNameOnly('無効トークンテスト')
        .build()

      const request = new NextRequest(`http://localhost:3000/api/v1/ingredients/${ingredientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateCommand),
      })

      // When: APIを呼び出す
      const response = await PUT(request, { params: Promise.resolve({ id: ingredientId }) })
      const data = await response.json()

      // Then: 401 Unauthorizedが返される
      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })
})
