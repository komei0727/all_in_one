import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { UnitId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'

import { UnitBuilder } from '../../../../../../__fixtures__/builders'
import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '../../../../../../helpers/database.helper'

describe('PrismaUnitRepository Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let repository: PrismaUnitRepository

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()
    repository = new PrismaUnitRepository(prisma as any)
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('findAllActive', () => {
    it('アクティブな単位を表示順で取得できる', async () => {
      // When: アクティブな単位を取得
      const units = await repository.findAllActive()

      // Then: 3つの単位が表示順で取得される（シードデータ）
      expect(units).toHaveLength(3)
      expect(units[0].getName()).toBe('個')
      expect(units[0].getSymbol()).toBe('個')
      expect(units[0].getDisplayOrder()).toBe(1)
      expect(units[1].getName()).toBe('グラム')
      expect(units[1].getSymbol()).toBe('g')
      expect(units[1].getDisplayOrder()).toBe(2)
      expect(units[2].getName()).toBe('ミリリットル')
      expect(units[2].getSymbol()).toBe('ml')
      expect(units[2].getDisplayOrder()).toBe(3)
    })

    it('非アクティブな単位は取得されない', async () => {
      // Given: 1つの単位を非アクティブにする
      const testDataIds = getTestDataIds()
      await prisma.unit.update({
        where: { id: testDataIds.units.gram },
        data: { isActive: false },
      })

      // When: アクティブな単位を取得
      const units = await repository.findAllActive()

      // Then: アクティブな単位のみ取得される
      expect(units).toHaveLength(2)
      expect(units.find((u) => u.getId() === testDataIds.units.gram)).toBeUndefined()
    })

    it('新しい単位を追加してもアクティブな単位のみ取得される', async () => {
      // Given: 新しいアクティブな単位と非アクティブな単位を追加
      const uniqueName1 = `テスト単位_${faker.string.alphanumeric(8)}`
      const uniqueSymbol1 = faker.string.alphanumeric(3)
      const uniqueName2 = `テスト単位_${faker.string.alphanumeric(8)}`
      const uniqueSymbol2 = faker.string.alphanumeric(3)

      await prisma.unit.create({
        data: {
          id: testDataHelpers.unitId(),
          name: uniqueName1,
          symbol: uniqueSymbol1,
          displayOrder: faker.number.int({ min: 10, max: 20 }),
          isActive: true,
          type: 'COUNT',
        },
      })
      await prisma.unit.create({
        data: {
          id: testDataHelpers.unitId(),
          name: uniqueName2,
          symbol: uniqueSymbol2,
          displayOrder: faker.number.int({ min: 21, max: 30 }),
          isActive: false,
          type: 'COUNT',
        },
      })

      // When: アクティブな単位を取得
      const units = await repository.findAllActive()

      // Then: アクティブな単位のみ取得される（シードデータ3 + 新規1）
      expect(units).toHaveLength(4)
      const addedUnit = units.find((u) => u.getName() === uniqueName1)
      expect(addedUnit).toBeDefined()
      expect(addedUnit?.getSymbol()).toBe(uniqueSymbol1)
      expect(units.find((u) => u.getName() === uniqueName2)).toBeUndefined()
    })

    it('表示順通りに取得される', async () => {
      // Given: 異なる表示順の単位を追加
      const units = [
        { order: 100, name: `単位100_${faker.string.alphanumeric(4)}` },
        { order: 50, name: `単位50_${faker.string.alphanumeric(4)}` },
        { order: 75, name: `単位75_${faker.string.alphanumeric(4)}` },
      ]

      for (const unit of units) {
        await prisma.unit.create({
          data: {
            id: testDataHelpers.unitId(),
            name: unit.name,
            symbol: faker.string.alphanumeric(2),
            displayOrder: unit.order,
            isActive: true,
            type: 'COUNT',
          },
        })
      }

      // When: アクティブな単位を取得
      const result = await repository.findAllActive()

      // Then: 表示順通りに並んでいる
      const displayOrders = result.map((u) => u.getDisplayOrder())
      for (let i = 1; i < displayOrders.length; i++) {
        expect(displayOrders[i]).toBeGreaterThanOrEqual(displayOrders[i - 1])
      }
    })
  })

  describe('findById', () => {
    it('IDで単位を取得できる', async () => {
      // When: IDで単位を検索
      const testDataIds = getTestDataIds()
      const unit = await repository.findById(new UnitId(testDataIds.units.piece))

      // Then: 単位が取得できる
      expect(unit).toBeDefined()
      expect(unit?.getId()).toBe(testDataIds.units.piece)
      expect(unit?.getName()).toBe('個')
      expect(unit?.getSymbol()).toBe('個')
      expect(unit?.getDisplayOrder()).toBe(1)
    })

    it('存在しないIDの場合nullを返す', async () => {
      // When: 存在しないIDで検索
      const nonExistentId = testDataHelpers.unitId() // 新しいID形式を生成
      const unit = await repository.findById(new UnitId(nonExistentId))

      // Then: nullが返される
      expect(unit).toBeNull()
    })

    it('新しく作成した単位を取得できる', async () => {
      // Given: 新しい単位を作成（ユニークなシンボルを確保）
      const uniqueSymbol = faker.string.alphanumeric(6) // 10文字以内
      const newUnit = new UnitBuilder()
        .withGeneratedId()
        .withName(`テスト単位_${faker.string.alphanumeric(6)}`)
        .withSymbol(uniqueSymbol)
        .withRandomDisplayOrder()
        .build()

      await prisma.unit.create({
        data: {
          id: newUnit.getId(),
          name: newUnit.getName(),
          symbol: newUnit.getSymbol(),
          displayOrder: newUnit.getDisplayOrder(),
          isActive: true,
          type: 'COUNT',
        },
      })

      // When: IDで検索
      const found = await repository.findById(new UnitId(newUnit.getId()))

      // Then: 単位が取得できる
      expect(found).toBeDefined()
      expect(found?.getId()).toBe(newUnit.getId())
      expect(found?.getName()).toBe(newUnit.getName())
      expect(found?.getSymbol()).toBe(newUnit.getSymbol())
      expect(found?.getDisplayOrder()).toBe(newUnit.getDisplayOrder())
    })

    it('非アクティブな単位も取得できる', async () => {
      // Given: 単位を非アクティブにする
      const testDataIds = getTestDataIds()
      await prisma.unit.update({
        where: { id: testDataIds.units.milliliter },
        data: { isActive: false },
      })

      // When: IDで検索
      const unit = await repository.findById(new UnitId(testDataIds.units.milliliter))

      // Then: 非アクティブでも取得できる
      expect(unit).toBeDefined()
      expect(unit?.getId()).toBe(testDataIds.units.milliliter)
      expect(unit?.getName()).toBe('ミリリットル')
    })
  })

  describe('データベース接続の確認', () => {
    it('Prismaクライアントが正しく動作する', async () => {
      // When: データベースに直接クエリ
      const count = await prisma.unit.count()

      // Then: 3つの単位が存在する（シードデータ）
      expect(count).toBe(3)
    })

    it('トランザクションが正しく動作する', async () => {
      // Given: ランダムな単位データ（ユニークなシンボルを確保）
      const uniqueSymbol = faker.string.alphanumeric(7) // 10文字以内
      const newUnit = new UnitBuilder()
        .withGeneratedId()
        .withName(`テスト単位_${faker.string.alphanumeric(6)}`)
        .withSymbol(uniqueSymbol)
        .withRandomDisplayOrder()
        .build()

      // When: トランザクション内で新しい単位を作成
      const created = await prisma.$transaction(async (tx) => {
        return await tx.unit.create({
          data: {
            id: newUnit.getId(),
            name: newUnit.getName(),
            symbol: newUnit.getSymbol(),
            displayOrder: newUnit.getDisplayOrder(),
            isActive: true,
            type: 'COUNT',
          },
        })
      })

      // Then: 単位が作成されている
      expect(created).toBeDefined()
      expect(created.name).toBe(newUnit.getName())

      // And: リポジトリ経由でも取得できる
      const found = await repository.findById(new UnitId(newUnit.getId()))
      expect(found).toBeDefined()
      expect(found?.getName()).toBe(newUnit.getName())
    })
  })

  describe('エッジケース', () => {
    it('同じ表示順の単位を複数作成できる', async () => {
      // Given: 同じ表示順の単位を作成
      const sameOrder = 999
      const units = Array.from({ length: 3 }, (_, i) => ({
        id: testDataHelpers.unitId(),
        name: `単位${i}_${faker.string.alphanumeric(4)}`,
        symbol: faker.string.alphanumeric(2),
        displayOrder: sameOrder,
      }))

      for (const unit of units) {
        await prisma.unit.create({
          data: { ...unit, isActive: true, type: 'COUNT' },
        })
      }

      // When: すべての単位を取得
      const allUnits = await repository.findAllActive()

      // Then: 同じ表示順の単位が存在する
      const sameOrderUnits = allUnits.filter((u) => u.getDisplayOrder() === sameOrder)
      expect(sameOrderUnits).toHaveLength(3)
    })

    it('特殊文字を含む単位名・記号を正しく扱える', async () => {
      // Given: 特殊文字を含む単位
      const specialUnit = {
        id: testDataHelpers.unitId(),
        name: '㎡（平方メートル）',
        symbol: '㎡',
        displayOrder: faker.number.int({ min: 100, max: 200 }),
      }

      await prisma.unit.create({
        data: { ...specialUnit, isActive: true, type: 'VOLUME' },
      })

      // When: IDで検索
      const found = await repository.findById(new UnitId(specialUnit.id))

      // Then: 特殊文字が正しく取得される
      expect(found).toBeDefined()
      expect(found?.getName()).toBe('㎡（平方メートル）')
      expect(found?.getSymbol()).toBe('㎡')
    })
  })
})
