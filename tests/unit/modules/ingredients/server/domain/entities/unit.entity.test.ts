import { describe, it, expect } from 'vitest'

import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import { RequiredFieldException } from '@/modules/ingredients/server/domain/exceptions'

import { UnitBuilder } from '../../../../../../__fixtures__/builders'
import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

/**
 * Unit Entity のテスト
 *
 * テスト対象:
 * - 単位エンティティの生成とバリデーション
 * - ビジネスルールの適用（値オブジェクトによる）
 * - シリアライズ機能
 */
describe('Unit Entity', () => {
  describe('constructor', () => {
    it('should create a unit with valid data', () => {
      // 単位エンティティが正常なデータで生成できることを確認
      // Arrange & Act
      const unit = new UnitBuilder().asGram().build()

      // Assert
      expect(unit.id.getValue()).toBeTruthy()
      expect(unit.name.getValue()).toBe('グラム')
      expect(unit.symbol.getValue()).toBe('g')
      expect(unit.displayOrder.getValue()).toBe(1)
      expect(unit.type.getValue()).toBe('WEIGHT') // 重量タイプのグラム
    })

    it('should create a count type unit', () => {
      // 個数タイプの単位が正常に生成できることを確認
      // Arrange & Act
      const unit = new UnitBuilder().withType('COUNT').withName('個').withSymbol('個').build()

      // Assert
      expect(unit.type.getValue()).toBe('COUNT')
      expect(unit.type.isCount()).toBe(true)
      expect(unit.type.isWeight()).toBe(false)
      expect(unit.type.isVolume()).toBe(false)
    })

    it('should create a volume type unit', () => {
      // 容量タイプの単位が正常に生成できることを確認
      // Arrange & Act
      const unit = new UnitBuilder()
        .withType('VOLUME')
        .withName('ミリリットル')
        .withSymbol('ml')
        .build()

      // Assert
      expect(unit.type.getValue()).toBe('VOLUME')
      expect(unit.type.isVolume()).toBe(true)
      expect(unit.type.isCount()).toBe(false)
      expect(unit.type.isWeight()).toBe(false)
    })

    it('should throw error if name is empty', () => {
      // 単位名が空の場合、値オブジェクトのバリデーションによりエラーがスローされることを確認
      // Arrange
      const builder = new UnitBuilder().withName('').withSymbol('g').withDisplayOrder(1)

      // Act & Assert
      expect(() => builder.build()).toThrow(RequiredFieldException)
    })

    it('should throw error if symbol is empty', () => {
      // 記号が空の場合、値オブジェクトのバリデーションによりエラーがスローされることを確認
      // Arrange
      const builder = new UnitBuilder().withName('グラム').withSymbol('').withDisplayOrder(1)

      // Act & Assert
      expect(() => builder.build()).toThrow(RequiredFieldException)
    })

    it('should use default display order if not provided', () => {
      // 表示順が指定されない場合、デフォルト値（0）が設定されることを確認
      // Arrange
      const unitData = {
        id: new UnitBuilder().build().id.getValue(),
        name: 'グラム',
        symbol: 'g',
        type: 'WEIGHT',
      }

      // Act
      const unit = new Unit(unitData)

      // Assert
      expect(unit.displayOrder.getValue()).toBe(0)
    })
  })

  describe('unit type conversion rules', () => {
    it('should allow conversion between same type units', () => {
      // 同じタイプの単位間では変換可能であることを確認
      // Arrange
      const gram = new UnitBuilder().withType('WEIGHT').withName('グラム').withSymbol('g').build()
      const kilogram = new UnitBuilder()
        .withType('WEIGHT')
        .withName('キログラム')
        .withSymbol('kg')
        .build()

      // Act & Assert
      expect(gram.type.canConvertTo(kilogram.type)).toBe(true)
    })

    it('should not allow conversion between different type units', () => {
      // 異なるタイプの単位間では変換不可能であることを確認
      // Arrange
      const gram = new UnitBuilder().withType('WEIGHT').withName('グラム').withSymbol('g').build()
      const piece = new UnitBuilder().withType('COUNT').withName('個').withSymbol('個').build()
      const milliliter = new UnitBuilder()
        .withType('VOLUME')
        .withName('ミリリットル')
        .withSymbol('ml')
        .build()

      // Act & Assert
      expect(gram.type.canConvertTo(piece.type)).toBe(false)
      expect(gram.type.canConvertTo(milliliter.type)).toBe(false)
      expect(piece.type.canConvertTo(milliliter.type)).toBe(false)
    })

    it('should provide proper type checking methods', () => {
      // 型チェックメソッドが正しく動作することを確認
      // Arrange
      const gram = new UnitBuilder().withType('WEIGHT').withName('グラム').withSymbol('g').build()
      const piece = new UnitBuilder().withType('COUNT').withName('個').withSymbol('個').build()
      const milliliter = new UnitBuilder()
        .withType('VOLUME')
        .withName('ミリリットル')
        .withSymbol('ml')
        .build()

      // Act & Assert
      expect(gram.type.isWeight()).toBe(true)
      expect(piece.type.isCount()).toBe(true)
      expect(milliliter.type.isVolume()).toBe(true)
    })
  })

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      // エンティティがプレーンオブジェクトとしてシリアライズできることを確認
      // これはAPIレスポンスやデータ永続化で使用される
      // Arrange
      const unitId = testDataHelpers.unitId()
      const unit = new UnitBuilder().withId(unitId).asGram().build()

      // Act
      const json = unit.toJSON()

      // Assert
      expect(json).toEqual({
        id: unitId,
        name: 'グラム',
        symbol: 'g',
        type: 'WEIGHT',
        displayOrder: 1,
      })
    })
  })
})
