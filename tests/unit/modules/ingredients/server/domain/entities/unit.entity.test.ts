import { describe, it, expect } from 'vitest'

import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import { RequiredFieldException } from '@/modules/ingredients/server/domain/exceptions'

import { UnitBuilder } from '../../../../../../__fixtures__/builders'

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
      }

      // Act
      const unit = new Unit(unitData)

      // Assert
      expect(unit.displayOrder.getValue()).toBe(0)
    })
  })

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      // エンティティがプレーンオブジェクトとしてシリアライズできることを確認
      // これはAPIレスポンスやデータ永続化で使用される
      // Arrange
      const unit = new UnitBuilder().withId('unit12345678').asGram().build()

      // Act
      const json = unit.toJSON()

      // Assert
      expect(json).toEqual({
        id: 'unit12345678',
        name: 'グラム',
        symbol: 'g',
        displayOrder: 1,
      })
    })
  })
})
