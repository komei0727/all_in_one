import { describe, it, expect } from 'vitest'

import { UnitMapper } from '@/modules/ingredients/server/application/mappers/unit.mapper'
import { type Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import { UnitBuilder } from '@tests/__fixtures__/builders'

/**
 * UnitMapper のテスト
 *
 * テスト対象:
 * - ドメインエンティティからDTOへの変換
 * - 複数のエンティティからリストDTOへの変換
 */
describe('UnitMapper', () => {
  describe('toDTO', () => {
    it('エンティティからDTOに正しく変換できる', () => {
      // テストデータ
      const unit = new UnitBuilder().asGram().build()

      // 実行
      const dto = UnitMapper.toDTO(unit)

      // 検証
      expect(dto.id).toBe(unit.getId())
      expect(dto.name).toBe('グラム')
      expect(dto.symbol).toBe('g')
      expect(dto.displayOrder).toBe(1)
    })

    it('日本語の記号を持つ単位も正しく変換できる', () => {
      // テストデータ
      const unit = new UnitBuilder().asPiece().withDisplayOrder(5).build()

      // 実行
      const dto = UnitMapper.toDTO(unit)

      // 検証
      expect(dto.id).toBe(unit.getId())
      expect(dto.name).toBe('個')
      expect(dto.symbol).toBe('個')
      expect(dto.displayOrder).toBe(5)
    })

    it('英数字混在の単位も正しく変換できる', () => {
      // テストデータ
      const unit = new UnitBuilder().asMilliliter().withDisplayOrder(3).build()

      // 実行
      const dto = UnitMapper.toDTO(unit)

      // 検証
      expect(dto.id).toBe(unit.getId())
      expect(dto.name).toBe('ミリリットル')
      expect(dto.symbol).toBe('ml')
      expect(dto.displayOrder).toBe(3)
    })
  })

  describe('toListDTO', () => {
    it('複数のエンティティからリストDTOに変換できる', () => {
      // テストデータ
      const units = [
        new UnitBuilder().asGram().withDisplayOrder(1).build(),
        new UnitBuilder().asKilogram().withDisplayOrder(2).build(),
        new UnitBuilder().asMilliliter().withDisplayOrder(3).build(),
        new UnitBuilder().asLiter().withDisplayOrder(4).build(),
      ]

      // 実行
      const listDto = UnitMapper.toListDTO(units)

      // 検証
      expect(listDto.units).toHaveLength(4)
      expect(listDto.units[0].id).toBe(units[0].getId())
      expect(listDto.units[0].name).toBe('グラム')
      expect(listDto.units[0].symbol).toBe('g')
      expect(listDto.units[0].displayOrder).toBe(1)
      expect(listDto.units[1].id).toBe(units[1].getId())
      expect(listDto.units[1].name).toBe('キログラム')
      expect(listDto.units[1].symbol).toBe('kg')
      expect(listDto.units[1].displayOrder).toBe(2)
      expect(listDto.units[2].id).toBe(units[2].getId())
      expect(listDto.units[2].name).toBe('ミリリットル')
      expect(listDto.units[2].symbol).toBe('ml')
      expect(listDto.units[2].displayOrder).toBe(3)
      expect(listDto.units[3].id).toBe(units[3].getId())
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
        new UnitBuilder().withName('個').withSymbol('個').withDisplayOrder(1).build(),
        new UnitBuilder().withName('本').withSymbol('本').withDisplayOrder(2).build(),
        new UnitBuilder().withName('枚').withSymbol('枚').withDisplayOrder(3).build(),
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
        new UnitBuilder().asGram().withDisplayOrder(1).build(),
        new UnitBuilder().asKilogram().withDisplayOrder(2).build(),
      ]

      // 実行
      const listDto = UnitMapper.toListDTO(units)
      const json = listDto.toJSON()

      // 検証
      expect(json).toEqual({
        units: [
          { id: units[0].getId(), name: 'グラム', symbol: 'g', displayOrder: 1 },
          { id: units[1].getId(), name: 'キログラム', symbol: 'kg', displayOrder: 2 },
        ],
      })
    })
  })
})
