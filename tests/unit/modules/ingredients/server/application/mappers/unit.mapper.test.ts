import { describe, it, expect } from 'vitest'

import { UnitMapper } from '@/modules/ingredients/server/application/mappers/unit.mapper'
import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'

/**
 * UnitMapper のテスト
 *
 * テスト対象:
 * - ドメインエンティティからDTOへの変換
 * - 複数のエンティティからリストDTOへの変換
 */
describe('UnitMapper', () => {
  // テスト用の単位エンティティを作成
  const createTestUnit = (id: string, name: string, symbol: string, order: number): Unit => {
    return new Unit({
      id,
      name,
      symbol,
      displayOrder: order,
    })
  }

  describe('toDTO', () => {
    it('エンティティからDTOに正しく変換できる', () => {
      // テストデータ
      const unit = createTestUnit('unit-001', 'グラム', 'g', 1)

      // 実行
      const dto = UnitMapper.toDTO(unit)

      // 検証
      expect(dto.id).toBe('unit-001')
      expect(dto.name).toBe('グラム')
      expect(dto.symbol).toBe('g')
      expect(dto.displayOrder).toBe(1)
    })

    it('日本語の記号を持つ単位も正しく変換できる', () => {
      // テストデータ
      const unit = createTestUnit('unit-002', '個', '個', 5)

      // 実行
      const dto = UnitMapper.toDTO(unit)

      // 検証
      expect(dto.id).toBe('unit-002')
      expect(dto.name).toBe('個')
      expect(dto.symbol).toBe('個')
      expect(dto.displayOrder).toBe(5)
    })

    it('英数字混在の単位も正しく変換できる', () => {
      // テストデータ
      const unit = createTestUnit('unit-003', 'ミリリットル', 'ml', 3)

      // 実行
      const dto = UnitMapper.toDTO(unit)

      // 検証
      expect(dto.id).toBe('unit-003')
      expect(dto.name).toBe('ミリリットル')
      expect(dto.symbol).toBe('ml')
      expect(dto.displayOrder).toBe(3)
    })
  })

  describe('toListDTO', () => {
    it('複数のエンティティからリストDTOに変換できる', () => {
      // テストデータ
      const units = [
        createTestUnit('unit-001', 'グラム', 'g', 1),
        createTestUnit('unit-002', 'キログラム', 'kg', 2),
        createTestUnit('unit-003', 'ミリリットル', 'ml', 3),
        createTestUnit('unit-004', 'リットル', 'L', 4),
      ]

      // 実行
      const listDto = UnitMapper.toListDTO(units)

      // 検証
      expect(listDto.units).toHaveLength(4)
      expect(listDto.units[0].id).toBe('unit-001')
      expect(listDto.units[0].name).toBe('グラム')
      expect(listDto.units[0].symbol).toBe('g')
      expect(listDto.units[0].displayOrder).toBe(1)
      expect(listDto.units[1].id).toBe('unit-002')
      expect(listDto.units[1].name).toBe('キログラム')
      expect(listDto.units[1].symbol).toBe('kg')
      expect(listDto.units[1].displayOrder).toBe(2)
      expect(listDto.units[2].id).toBe('unit-003')
      expect(listDto.units[2].name).toBe('ミリリットル')
      expect(listDto.units[2].symbol).toBe('ml')
      expect(listDto.units[2].displayOrder).toBe(3)
      expect(listDto.units[3].id).toBe('unit-004')
      expect(listDto.units[3].name).toBe('リットル')
      expect(listDto.units[3].symbol).toBe('L')
      expect(listDto.units[3].displayOrder).toBe(4)
    })

    it('空の配列からも正しくリストDTOに変換できる', () => {
      // テストデータ
      const units: Unit[] = []

      // 実行
      const listDto = UnitMapper.toListDTO(units)

      // 検証
      expect(listDto.units).toHaveLength(0)
    })

    it('日本語単位のみの配列も正しく変換できる', () => {
      // テストデータ
      const units = [
        createTestUnit('unit-001', '個', '個', 1),
        createTestUnit('unit-002', '本', '本', 2),
        createTestUnit('unit-003', '枚', '枚', 3),
      ]

      // 実行
      const listDto = UnitMapper.toListDTO(units)

      // 検証
      expect(listDto.units).toHaveLength(3)
      expect(listDto.units.every((unit) => unit.name === unit.symbol)).toBe(true)
    })

    it('toJSONメソッドが正しいフォーマットを返す', () => {
      // テストデータ
      const units = [
        createTestUnit('unit-001', 'グラム', 'g', 1),
        createTestUnit('unit-002', 'キログラム', 'kg', 2),
      ]

      // 実行
      const listDto = UnitMapper.toListDTO(units)
      const json = listDto.toJSON()

      // 検証
      expect(json).toEqual({
        units: [
          { id: 'unit-001', name: 'グラム', symbol: 'g', displayOrder: 1 },
          { id: 'unit-002', name: 'キログラム', symbol: 'kg', displayOrder: 2 },
        ],
      })
    })
  })
})
