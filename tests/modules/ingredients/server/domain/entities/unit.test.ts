import { describe, it, expect } from 'vitest'

import { Unit } from '@/modules/ingredients/server/domain/entities/unit'

/**
 * Unit Entity のテスト
 *
 * テスト対象:
 * - 単位エンティティの生成とバリデーション
 * - ビジネスルールの適用（名前、記号の必須チェック、表示順のデフォルト値）
 * - シリアライズ機能
 */
describe('Unit Entity', () => {
  describe('constructor', () => {
    it('should create a unit with valid data', () => {
      // 単位エンティティが正常なデータで生成できることを確認
      // Arrange
      const unitData = {
        id: 'unit1',
        name: 'グラム',
        symbol: 'g',
        displayOrder: 1,
      }

      // Act
      const unit = new Unit(unitData)

      // Assert
      expect(unit.id).toBe('unit1')
      expect(unit.name).toBe('グラム')
      expect(unit.symbol).toBe('g')
      expect(unit.displayOrder).toBe(1)
    })

    it('should throw error if name is empty', () => {
      // 単位名が空の場合、ビジネスルールによりエラーがスローされることを確認
      // Arrange
      const unitData = {
        id: 'unit1',
        name: '',
        symbol: 'g',
        displayOrder: 1,
      }

      // Act & Assert
      expect(() => new Unit(unitData)).toThrow('Unit name cannot be empty')
    })

    it('should throw error if symbol is empty', () => {
      // 記号が空の場合、ビジネスルールによりエラーがスローされることを確認
      // Arrange
      const unitData = {
        id: 'unit1',
        name: 'グラム',
        symbol: '',
        displayOrder: 1,
      }

      // Act & Assert
      expect(() => new Unit(unitData)).toThrow('Unit symbol cannot be empty')
    })

    it('should use default display order if not provided', () => {
      // 表示順が指定されない場合、デフォルト値（0）が設定されることを確認
      // Arrange
      const unitData = {
        id: 'unit1',
        name: 'グラム',
        symbol: 'g',
      }

      // Act
      const unit = new Unit(unitData)

      // Assert
      expect(unit.displayOrder).toBe(0)
    })
  })

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      // エンティティがプレーンオブジェクトとしてシリアライズできることを確認
      // これはAPIレスポンスやデータ永続化で使用される
      // Arrange
      const unit = new Unit({
        id: 'unit1',
        name: 'グラム',
        symbol: 'g',
        displayOrder: 1,
      })

      // Act
      const json = unit.toJSON()

      // Assert
      expect(json).toEqual({
        id: 'unit1',
        name: 'グラム',
        symbol: 'g',
        displayOrder: 1,
      })
    })
  })
})
