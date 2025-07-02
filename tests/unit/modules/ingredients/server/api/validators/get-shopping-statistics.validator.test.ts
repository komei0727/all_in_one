import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { getShoppingStatisticsValidator } from '@/modules/ingredients/server/api/validators/get-shopping-statistics.validator'

describe('getShoppingStatisticsValidator', () => {
  describe('正常系', () => {
    it('periodDaysが未指定の場合はデフォルト値30を返す', () => {
      // 空のオブジェクトをバリデーション
      const result = getShoppingStatisticsValidator.parse({})

      // デフォルト値が設定されることを確認
      expect(result.periodDays).toBe(30)
    })

    it('periodDaysがundefinedの場合はデフォルト値30を返す', () => {
      // undefinedのperiodDaysをバリデーション
      const result = getShoppingStatisticsValidator.parse({ periodDays: undefined })

      // デフォルト値が設定されることを確認
      expect(result.periodDays).toBe(30)
    })

    it('有効な文字列数値を数値に変換する', () => {
      // 1から365の範囲の有効な値をテスト
      const validValues = [
        { input: '1', expected: 1 },
        { input: '7', expected: 7 },
        { input: '30', expected: 30 },
        { input: '90', expected: 90 },
        { input: '365', expected: 365 },
      ]

      validValues.forEach(({ input, expected }) => {
        const result = getShoppingStatisticsValidator.parse({ periodDays: input })
        expect(result.periodDays).toBe(expected)
      })
    })

    it('有効な境界値を受け入れる', () => {
      // 最小値と最大値のテスト
      const minResult = getShoppingStatisticsValidator.parse({ periodDays: '1' })
      expect(minResult.periodDays).toBe(1)

      const maxResult = getShoppingStatisticsValidator.parse({ periodDays: '365' })
      expect(maxResult.periodDays).toBe(365)
    })

    it('先頭に0がある数値文字列を正しく処理する', () => {
      // 先頭0付きの文字列をテスト
      const result = getShoppingStatisticsValidator.parse({ periodDays: '007' })
      expect(result.periodDays).toBe(7)
    })
  })

  describe('異常系', () => {
    it('非数値文字列の場合はエラーを投げる', () => {
      // 非数値文字列のテストケース（parseIntでNaNになるもの）
      const invalidValues = ['abc', 'hello', 'NaN', 'Infinity', '-Infinity']

      invalidValues.forEach((invalidValue) => {
        expect(() => {
          getShoppingStatisticsValidator.parse({ periodDays: invalidValue })
        }).toThrow()
      })
    })

    it('空文字列の場合はデフォルト値30を返す', () => {
      // 空文字列はfalsyな値としてデフォルト値が使用される
      const result = getShoppingStatisticsValidator.parse({ periodDays: '' })
      expect(result.periodDays).toBe(30)
    })

    it('範囲外の小さい値の場合はエラーを投げる', () => {
      // 1未満の値をテスト
      const invalidSmallValues = ['0', '-1', '-10']

      invalidSmallValues.forEach((value) => {
        expect(() => {
          getShoppingStatisticsValidator.parse({ periodDays: value })
        }).toThrow(ZodError)

        try {
          getShoppingStatisticsValidator.parse({ periodDays: value })
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors[0].message).toBe('periodDays must be between 1 and 365')
        }
      })
    })

    it('範囲外の大きい値の場合はエラーを投げる', () => {
      // 365超過の値をテスト
      const invalidLargeValues = ['366', '400', '1000', '9999']

      invalidLargeValues.forEach((value) => {
        expect(() => {
          getShoppingStatisticsValidator.parse({ periodDays: value })
        }).toThrow(ZodError)

        try {
          getShoppingStatisticsValidator.parse({ periodDays: value })
        } catch (error) {
          expect(error).toBeInstanceOf(ZodError)
          const zodError = error as ZodError
          expect(zodError.errors[0].message).toBe('periodDays must be between 1 and 365')
        }
      })
    })

    it('負数の場合はエラーを投げる', () => {
      // 負数のテスト
      const negativeValues = ['-1', '-5', '-100']

      negativeValues.forEach((value) => {
        expect(() => {
          getShoppingStatisticsValidator.parse({ periodDays: value })
        }).toThrow(ZodError)
      })
    })

    it('小数点を含む文字列の場合は整数部分が使用される', () => {
      // 小数点を含む値のテスト（parseIntは整数部分のみを返す）
      const result1 = getShoppingStatisticsValidator.parse({ periodDays: '1.9' })
      expect(result1.periodDays).toBe(1)

      const result2 = getShoppingStatisticsValidator.parse({ periodDays: '30.5' })
      expect(result2.periodDays).toBe(30)

      const result3 = getShoppingStatisticsValidator.parse({ periodDays: '365.0' })
      expect(result3.periodDays).toBe(365)
    })

    it('指数表記文字列の場合は先頭の数字が使用される', () => {
      // 指数表記は先頭の数字のみparseIntで処理される
      const result = getShoppingStatisticsValidator.parse({ periodDays: '1e5' })
      expect(result.periodDays).toBe(1)

      const result2 = getShoppingStatisticsValidator.parse({ periodDays: '2e10' })
      expect(result2.periodDays).toBe(2)
    })

    it('null値の場合はエラーを投げる', () => {
      expect(() => {
        getShoppingStatisticsValidator.parse({ periodDays: null })
      }).toThrow(ZodError)
    })

    it('数値型（文字列以外）が渡された場合のエラー', () => {
      // 数値型のテスト（文字列以外）
      expect(() => {
        getShoppingStatisticsValidator.parse({ periodDays: 30 })
      }).toThrow(ZodError)
    })

    it('配列が渡された場合はエラーを投げる', () => {
      expect(() => {
        getShoppingStatisticsValidator.parse({ periodDays: ['30'] })
      }).toThrow(ZodError)
    })

    it('オブジェクトが渡された場合はエラーを投げる', () => {
      expect(() => {
        getShoppingStatisticsValidator.parse({ periodDays: { value: '30' } })
      }).toThrow(ZodError)
    })
  })

  describe('ランダムテスト', () => {
    it('有効な範囲のランダムな値を正しく処理する', () => {
      // 1から365の間のランダムな値を100回テスト
      for (let i = 0; i < 100; i++) {
        const randomValue = faker.number.int({ min: 1, max: 365 })
        const result = getShoppingStatisticsValidator.parse({ periodDays: randomValue.toString() })
        expect(result.periodDays).toBe(randomValue)
        expect(result.periodDays).toBeGreaterThanOrEqual(1)
        expect(result.periodDays).toBeLessThanOrEqual(365)
      }
    })

    it('無効な範囲のランダムな値はエラーになる', () => {
      // 無効な範囲のランダムな値をテスト
      for (let i = 0; i < 50; i++) {
        // 0以下のランダムな値
        const invalidSmall = faker.number.int({ min: -1000, max: 0 })
        expect(() => {
          getShoppingStatisticsValidator.parse({ periodDays: invalidSmall.toString() })
        }).toThrow(ZodError)

        // 365超過のランダムな値
        const invalidLarge = faker.number.int({ min: 366, max: 10000 })
        expect(() => {
          getShoppingStatisticsValidator.parse({ periodDays: invalidLarge.toString() })
        }).toThrow(ZodError)
      }
    })
  })
})
