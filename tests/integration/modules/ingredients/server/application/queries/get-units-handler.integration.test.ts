/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { GetUnitsQueryHandler } from '@/modules/ingredients/server/application/queries/get-units.handler'
import { GetUnitsQuery } from '@/modules/ingredients/server/application/queries/get-units.query'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'

import { testDataHelpers } from '../../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '../../../../../../helpers/database.helper'

/**
 * GetUnitsHandler統合テスト
 *
 * 単位一覧取得機能をデータベースとの統合で検証
 */
describe('GetUnitsHandler Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let handler: GetUnitsQueryHandler
  let repository: PrismaUnitRepository

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // リポジトリとハンドラーの初期化
    repository = new PrismaUnitRepository(prisma as any)
    handler = new GetUnitsQueryHandler(repository)
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    it('アクティブな単位一覧を取得できる', async () => {
      // Given: クエリを作成
      const query = new GetUnitsQuery()

      // When: ハンドラーを実行
      const result = (await handler.handle(query)) as any

      // Then: シードデータの3単位が表示順で取得される
      const testDataIds = getTestDataIds()
      expect(result.units).toHaveLength(3)
      expect(result.units[0].id).toBe(testDataIds.units.piece)
      expect(result.units[0].name).toBe('個')
      expect(result.units[0].symbol).toBe('個')
      expect(result.units[0].displayOrder).toBe(1)
      expect(result.units[1].id).toBe(testDataIds.units.gram)
      expect(result.units[1].name).toBe('グラム')
      expect(result.units[1].symbol).toBe('g')
      expect(result.units[1].displayOrder).toBe(2)
      expect(result.units[2].id).toBe(testDataIds.units.milliliter)
      expect(result.units[2].name).toBe('ミリリットル')
      expect(result.units[2].symbol).toBe('ml')
      expect(result.units[2].displayOrder).toBe(3)
    })

    it('非アクティブな単位は取得されない', async () => {
      // Given: 1つの単位を非アクティブにする
      const testDataIds = getTestDataIds()
      await prisma.unit.update({
        where: { id: testDataIds.units.gram },
        data: { isActive: false },
      })

      // When: 単位一覧を取得
      const result = (await handler.handle(new GetUnitsQuery())) as any

      // Then: アクティブな単位のみ取得される
      expect(result.units).toHaveLength(2)
      expect(result.units.find((u: any) => u.id === testDataIds.units.gram)).toBeUndefined()
      expect(result.units[0].id).toBe(testDataIds.units.piece)
      expect(result.units[1].id).toBe(testDataIds.units.milliliter)
    })

    it('新しい単位を追加しても表示順で取得される', async () => {
      // Given: 新しい単位を追加（ユニークなシンボルを確保）
      const newUnitId = testDataHelpers.unitId()
      const newUnitName = `テスト単位_${faker.string.alphanumeric(6)}`
      const newUnitSymbol = faker.string.alphanumeric(5)
      await prisma.unit.create({
        data: {
          id: newUnitId,
          name: newUnitName,
          symbol: newUnitSymbol,
          displayOrder: 0, // 最初に表示
          isActive: true,
          type: 'COUNT',
        },
      })

      // When: 単位一覧を取得
      const result = (await handler.handle(new GetUnitsQuery())) as any

      // Then: 4つの単位が表示順で取得される
      expect(result.units).toHaveLength(4)
      expect(result.units[0].id).toBe(newUnitId)
      expect(result.units[0].name).toBe(newUnitName)
      expect(result.units[0].symbol).toBe(newUnitSymbol)
      const testDataIds = getTestDataIds()
      expect(result.units[0].displayOrder).toBe(0)
      expect(result.units[1].id).toBe(testDataIds.units.piece)
      expect(result.units[2].id).toBe(testDataIds.units.gram)
      expect(result.units[3].id).toBe(testDataIds.units.milliliter)
    })

    it('単位が0件の場合は空配列を返す', async () => {
      // Given: すべての単位を削除
      await prisma.unit.deleteMany()

      // When: 単位一覧を取得
      const result = (await handler.handle(new GetUnitsQuery())) as any

      // Then: 空配列が返される
      expect(result.units).toEqual([])
    })

    it('同じ表示順の単位も正しく取得できる', async () => {
      // Given: 同じ表示順の単位を複数追加
      const sameOrder = 999
      const unitIds = []
      for (let i = 0; i < 3; i++) {
        const id = testDataHelpers.unitId()
        unitIds.push(id)
        await prisma.unit.create({
          data: {
            id,
            name: `同順単位${i}_${faker.string.alphanumeric(4)}`,
            symbol: faker.string.alphanumeric(3),
            displayOrder: sameOrder,
            isActive: true,
            type: 'COUNT',
          },
        })
      }

      // When: 単位一覧を取得
      const result = (await handler.handle(new GetUnitsQuery())) as any

      // Then: すべての単位が取得される（シード3 + 新規3）
      expect(result.units).toHaveLength(6)

      // 同じ表示順の単位が存在することを確認
      const sameOrderUnits = result.units.filter((u: any) => u.displayOrder === sameOrder)
      expect(sameOrderUnits).toHaveLength(3)

      // 作成した単位がすべて含まれていることを確認
      unitIds.forEach((id) => {
        expect(result.units.find((u: any) => u.id === id)).toBeDefined()
      })
    })

    it('異なる単位タイプ（COUNT, WEIGHT, VOLUME）が混在していても取得できる', async () => {
      // Given: 異なるタイプの単位を追加
      const unitTypes = [
        { type: 'COUNT', name: 'ダース', symbol: 'dz' },
        { type: 'WEIGHT', name: 'キログラム', symbol: 'kg' },
        { type: 'VOLUME', name: 'リットル', symbol: 'L' },
      ]

      for (const unitType of unitTypes) {
        await prisma.unit.create({
          data: {
            id: testDataHelpers.unitId(),
            name: unitType.name,
            symbol: unitType.symbol,
            displayOrder: faker.number.int({ min: 10, max: 20 }),
            isActive: true,
            type: unitType.type as any,
          },
        })
      }

      // When: 単位一覧を取得
      const result = (await handler.handle(new GetUnitsQuery())) as any

      // Then: すべてのタイプの単位が取得される（シード3 + 新規3）
      expect(result.units).toHaveLength(6)
      expect(result.units.find((u: any) => u.name === 'ダース')).toBeDefined()
      expect(result.units.find((u: any) => u.name === 'キログラム')).toBeDefined()
      expect(result.units.find((u: any) => u.name === 'リットル')).toBeDefined()
    })
  })

  describe('パフォーマンス', () => {
    it('大量の単位があっても高速に取得できる', async () => {
      // Given: 100個の単位を追加
      const units = Array.from({ length: 100 }, (_, i) => ({
        id: testDataHelpers.unitId(),
        name: `単位${i}_${faker.string.alphanumeric(4)}`,
        symbol: `s${i}_${faker.string.alphanumeric(2)}`, // ユニークなシンボルを生成
        displayOrder: 100 + i,
        isActive: true,
        type: faker.helpers.arrayElement(['COUNT', 'WEIGHT', 'VOLUME']),
      }))

      await prisma.unit.createMany({
        data: units,
      })

      // When: 単位一覧を取得（時間計測）
      const startTime = performance.now()
      const result = (await handler.handle(new GetUnitsQuery())) as any
      const endTime = performance.now()

      // Then: 103個の単位が取得される
      expect(result.units).toHaveLength(103) // シード3 + 新規100

      // パフォーマンスチェック（1秒以内）
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })

  describe('データ整合性', () => {
    it('並行してクエリを実行しても正しい結果を返す', async () => {
      // Given: クエリを作成
      const query = new GetUnitsQuery()

      // When: 並行して複数回実行
      const promises = Array.from({ length: 5 }, () => handler.handle(query) as any)
      const results = await Promise.all(promises)

      // Then: すべて同じ結果を返す
      expect(results).toHaveLength(5)
      const testDataIds = getTestDataIds()
      results.forEach((result) => {
        expect(result.units).toHaveLength(3)
        expect(result.units[0].id).toBe(testDataIds.units.piece)
        expect(result.units[1].id).toBe(testDataIds.units.gram)
        expect(result.units[2].id).toBe(testDataIds.units.milliliter)
      })
    })

    it('単位更新中でも一貫性のあるデータを返す', async () => {
      // Given: 単位一覧を取得
      const initialResult = (await handler.handle(new GetUnitsQuery())) as any
      expect(initialResult.units).toHaveLength(3)

      // When: 単位を更新しながら並行してクエリを実行
      const testDataIds = getTestDataIds()
      const updatePromise = prisma.unit.update({
        where: { id: testDataIds.units.piece },
        data: { name: `更新_${faker.string.alphanumeric(6)}` },
      })

      const queryPromise = handler.handle(new GetUnitsQuery()) as any

      const [_, result] = await Promise.all([updatePromise, queryPromise])

      // Then: 単位数は変わらない
      expect(result.units).toHaveLength(3)
      expect(result.units.map((u: any) => u.id).sort()).toEqual(
        [testDataIds.units.piece, testDataIds.units.gram, testDataIds.units.milliliter].sort()
      )
    })
  })

  describe('特殊ケース', () => {
    it('特殊文字を含む単位記号も正しく取得できる', async () => {
      // Given: 特殊文字を含む単位を追加
      const specialUnits = [
        { name: '平方メートル', symbol: '㎡' },
        { name: '立方メートル', symbol: '㎥' },
        { name: '度', symbol: '°' },
        { name: 'パーセント', symbol: '%' },
      ]

      for (const unit of specialUnits) {
        await prisma.unit.create({
          data: {
            id: testDataHelpers.unitId(),
            name: unit.name,
            symbol: unit.symbol,
            displayOrder: faker.number.int({ min: 10, max: 20 }),
            isActive: true,
            type: 'COUNT',
          },
        })
      }

      // When: 単位一覧を取得
      const result = (await handler.handle(new GetUnitsQuery())) as any

      // Then: 特殊文字の単位も正しく取得される
      expect(result.units).toHaveLength(7) // シード3 + 新規4
      expect(result.units.find((u: any) => u.symbol === '㎡')).toBeDefined()
      expect(result.units.find((u: any) => u.symbol === '㎥')).toBeDefined()
      expect(result.units.find((u: any) => u.symbol === '°')).toBeDefined()
      expect(result.units.find((u: any) => u.symbol === '%')).toBeDefined()
    })
  })
})
