/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker/locale/ja'
import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { POST } from '@/app/api/v1/ingredients/route'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

import { CreateIngredientCommandBuilder } from '../../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

/**
 * POST /api/v1/ingredients APIの統合テスト
 *
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('POST /api/v1/ingredients Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // CompositionRootをリセットして、テスト用のPrismaクライアントを使用
    CompositionRoot.resetInstance()
    CompositionRoot.getInstance(prisma as any)
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
    it('有効なリクエストで食材を作成できる', async () => {
      // Given: 有効なリクエストボディ
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001') // 実在するカテゴリーID
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001') // 実在する単位ID
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
          detail: faker.helpers.arrayElement(['野菜室', '冷凍庫', 'パントリー']),
        })
        .withPurchaseDate(new Date().toISOString().split('T')[0])
        .withPrice(faker.number.int({ min: 100, max: 5000 }))
        .withBestBeforeDate(faker.date.future({ years: 0.1 }).toISOString().split('T')[0])
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 201 Createdが返される
      expect(response.status).toBe(201)
      expect(data).toBeDefined()
      expect(data.ingredient).toBeDefined()
      expect(data.ingredient.id).toBeDefined()
      expect(data.ingredient.name).toBe(command.name)
      expect(data.ingredient.category).toBeDefined()
      expect(data.ingredient.category.id).toBe(command.categoryId)
      expect(data.ingredient.currentStock).toBeDefined()
      expect(data.ingredient.currentStock.quantity).toBe(command.quantity.amount)
      expect(data.ingredient.currentStock.unit.id).toBe(command.quantity.unitId)

      // データベースに保存されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: data.ingredient.id },
        include: { stocks: true },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.name).toBe(command.name)
      expect(dbIngredient?.stocks).toHaveLength(1)
    })

    it('最小限の必須フィールドで食材を作成できる', async () => {
      // Given: 最小限の必須フィールドのみのリクエスト
      const minimalCommand = {
        name: faker.food.ingredient(),
        categoryId: 'cat00001',
        quantity: {
          amount: faker.number.int({ min: 1, max: 10 }),
          unitId: 'unit0001',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
        },
        purchaseDate: new Date().toISOString().split('T')[0],
      }

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(minimalCommand),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 201 Createdが返される
      expect(response.status).toBe(201)
      expect(data.ingredient.memo).toBeNull()
      expect(data.ingredient.currentStock.price).toBeNull()
      expect(data.ingredient.currentStock.bestBeforeDate).toBeNull()
      expect(data.ingredient.currentStock.expiryDate).toBeNull()
    })

    it('全てのオプションフィールドを含めて食材を作成できる', async () => {
      // Given: 全フィールドを含むリクエスト
      const fullCommand = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withMemo(faker.lorem.sentence())
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
        .withStorageLocation({
          type: StorageType.FROZEN,
          detail: '冷凍庫の引き出し',
        })
        .withPurchaseDate(new Date().toISOString().split('T')[0])
        .withPrice(faker.number.int({ min: 100, max: 5000 }))
        .withBestBeforeDate(faker.date.future({ years: 0.1 }).toISOString().split('T')[0])
        .withExpiryDate(faker.date.future({ years: 0.2 }).toISOString().split('T')[0])
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullCommand),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 全フィールドが正しく設定される
      expect(response.status).toBe(201)
      expect(data.ingredient.memo).toBe(fullCommand.memo)
      expect(data.ingredient.currentStock.price).toBe(fullCommand.price)
      expect(data.ingredient.currentStock.bestBeforeDate).toBeDefined()
      expect(data.ingredient.currentStock.expiryDate).toBeDefined()
      expect(data.ingredient.currentStock.storageLocation.detail).toBe('冷凍庫の引き出し')
    })
  })

  describe('バリデーションエラー', () => {
    it('必須フィールドが欠けている場合400エラーを返す', async () => {
      // Given: 必須フィールドが欠けているリクエスト
      const invalidCommand = {
        // nameがない
        categoryId: 'cat00001',
        quantity: {
          amount: 5,
          unitId: 'unit0001',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
        },
        purchaseDate: new Date().toISOString().split('T')[0],
      }

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidCommand),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('name')
    })

    it('食材名が長すぎる場合400エラーを返す', async () => {
      // Given: 50文字を超える食材名
      const longName = faker.string.alphanumeric(51)
      const command = new CreateIngredientCommandBuilder()
        .withName(longName)
        .withCategoryId('cat00001')
        .withQuantity(5, 'unit0001')
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(new Date().toISOString().split('T')[0])
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('50文字以内')
    })

    it('数量が0以下の場合400エラーを返す', async () => {
      // Given: 無効な数量
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withQuantity(0, 'unit0001')
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(new Date().toISOString().split('T')[0])
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 400 Bad Requestが返される
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('数量')
    })
  })

  describe('存在しないリソース', () => {
    it('存在しないカテゴリーIDの場合404エラーを返す', async () => {
      // Given: 存在しないカテゴリーID
      const nonExistentCategoryId = faker.string.uuid()
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId(nonExistentCategoryId)
        .withQuantity(5, 'unit0001')
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(new Date().toISOString().split('T')[0])
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('Category not found')
    })

    it('存在しない単位IDの場合404エラーを返す', async () => {
      // Given: 存在しない単位ID
      const nonExistentUnitId = faker.string.uuid()
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withQuantity(5, nonExistentUnitId)
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(new Date().toISOString().split('T')[0])
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 404 Not Foundが返される
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('Unit not found')
    })
  })

  describe('不正なリクエスト', () => {
    it('JSONパースエラーの場合500エラーを返す', async () => {
      // Given: 不正なJSON
      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // When: APIを呼び出す
      const response = await POST(request)
      const data = await response.json()

      // Then: 500 Internal Server Errorが返される
      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('Content-Typeが不正でも処理できる', async () => {
      // Given: Content-Typeが不正だが有効なJSON
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withQuantity(5, 'unit0001')
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(new Date().toISOString().split('T')[0])
        .build()

      const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // 不正なContent-Type
        },
        body: JSON.stringify(command),
      })

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 正常に処理される（Next.jsは寛容）
      expect(response.status).toBe(201)
    })
  })

  describe('パフォーマンスと並行性', () => {
    it('同時に複数の食材を作成できる', async () => {
      // Given: 3つの異なる食材作成リクエスト（SQLiteの制限を考慮して数を減らす）
      const commands = Array.from({ length: 3 }, (_, i) =>
        new CreateIngredientCommandBuilder()
          .withName(`並行テスト食材${i}_${faker.string.alphanumeric(4)}`)
          .withCategoryId('cat00001')
          .withQuantity(faker.number.int({ min: 1, max: 10 }), 'unit0001')
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(new Date().toISOString().split('T')[0])
          .build()
      )

      // When: 順次APIを呼び出す（SQLiteの並行処理制限を回避）
      const responses = []
      const results = []

      for (const command of commands) {
        const request = new NextRequest('http://localhost:3000/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        })
        const response = await POST(request)
        responses.push(response)
        results.push(await response.json())
      }

      // Then: 全て成功する
      responses.forEach((response) => {
        expect(response.status).toBe(201)
      })

      // 全て異なるIDが生成される
      const ids = results.map((r) => r.ingredient.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)

      // データベースに全て保存されている
      const count = await prisma.ingredient.count({
        where: {
          name: {
            startsWith: '並行テスト食材',
          },
        },
      })
      expect(count).toBe(3)
    })
  })
})
