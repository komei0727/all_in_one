import { describe, it, expect } from 'vitest'

import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

// テスト用の具体的な値オブジェクトクラス
class TestValueObject extends ValueObject<string> {
  constructor(value: string) {
    super(value)
  }

  protected validate(value: string): void {
    if (!value || value.trim() === '') {
      throw new Error('値は必須です')
    }
  }
}

class NumberValueObject extends ValueObject<number> {
  constructor(value: number) {
    super(value)
  }

  protected validate(value: number): void {
    if (value < 0) {
      throw new Error('値は0以上である必要があります')
    }
  }
}

describe('ValueObject基底クラス', () => {
  describe('値オブジェクトの作成', () => {
    it('有効な値で作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const vo = new TestValueObject('テスト値')

      // Assert（検証）
      expect(vo.getValue()).toBe('テスト値')
    })

    it('数値型の値オブジェクトも作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const vo = new NumberValueObject(42)

      // Assert（検証）
      expect(vo.getValue()).toBe(42)
    })

    it('バリデーションエラーの場合は例外が発生する', () => {
      // Act & Assert（実行 & 検証）
      expect(() => new TestValueObject('')).toThrow('値は必須です')
      expect(() => new NumberValueObject(-1)).toThrow('値は0以上である必要があります')
    })
  })

  describe('equals メソッド', () => {
    it('同じ値を持つ値オブジェクトは等しい', () => {
      // Arrange（準備）
      const vo1 = new TestValueObject('同じ値')
      const vo2 = new TestValueObject('同じ値')

      // Act & Assert（実行 & 検証）
      expect(vo1.equals(vo2)).toBe(true)
    })

    it('異なる値を持つ値オブジェクトは等しくない', () => {
      // Arrange（準備）
      const vo1 = new TestValueObject('値1')
      const vo2 = new TestValueObject('値2')

      // Act & Assert（実行 & 検証）
      expect(vo1.equals(vo2)).toBe(false)
    })

    it('nullと比較するとfalseを返す', () => {
      // Arrange（準備）
      const vo = new TestValueObject('値')

      // Act & Assert（実行 & 検証）
      expect(vo.equals(null)).toBe(false)
    })

    it('undefinedと比較するとfalseを返す', () => {
      // Arrange（準備）
      const vo = new TestValueObject('値')

      // Act & Assert（実行 & 検証）
      expect(vo.equals(undefined)).toBe(false)
    })

    it('ValueObject以外のオブジェクトと比較するとfalseを返す', () => {
      // Arrange（準備）
      const vo = new TestValueObject('値')
      const notValueObject = { value: '値' } as any

      // Act & Assert（実行 & 検証）
      expect(vo.equals(notValueObject)).toBe(false)
    })

    it('異なる型の値オブジェクトは等しくない', () => {
      // Arrange（準備）
      const stringVo = new TestValueObject('42')
      const numberVo = new NumberValueObject(42)

      // Act & Assert（実行 & 検証）
      // TypeScriptの型システムでは型エラーになるが、実行時の動作をテスト
      expect(stringVo.equals(numberVo as any)).toBe(false)
    })
  })

  describe('toString メソッド', () => {
    it('文字列値の文字列表現を取得できる', () => {
      // Arrange（準備）
      const vo = new TestValueObject('文字列値')

      // Act & Assert（実行 & 検証）
      expect(vo.toString()).toBe('文字列値')
    })

    it('数値の文字列表現を取得できる', () => {
      // Arrange（準備）
      const vo = new NumberValueObject(123)

      // Act & Assert（実行 & 検証）
      expect(vo.toString()).toBe('123')
    })

    it('0の文字列表現も正しく取得できる', () => {
      // Arrange（準備）
      const vo = new NumberValueObject(0)

      // Act & Assert（実行 & 検証）
      expect(vo.toString()).toBe('0')
    })
  })

  describe('不変性の確認', () => {
    it('作成後に値を変更できない', () => {
      // Arrange（準備）
      const vo = new TestValueObject('初期値')

      // Act & Assert（実行 & 検証）
      // 値は protected なので直接アクセスできないことを確認
      expect(vo.getValue()).toBe('初期値')

      // 新しい値で別のインスタンスを作成する必要がある
      const vo2 = new TestValueObject('新しい値')
      expect(vo.getValue()).toBe('初期値') // 元の値は変わらない
      expect(vo2.getValue()).toBe('新しい値')
    })
  })

  describe('複雑な値型のテスト', () => {
    class ObjectValueObject extends ValueObject<{ name: string; age: number }> {
      constructor(value: { name: string; age: number }) {
        super(value)
      }

      protected validate(value: { name: string; age: number }): void {
        if (!value.name || value.age < 0) {
          throw new Error('無効なオブジェクト')
        }
      }
    }

    it('オブジェクト型の値オブジェクトも作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const vo = new ObjectValueObject({ name: '太郎', age: 20 })

      // Assert（検証）
      expect(vo.getValue()).toEqual({ name: '太郎', age: 20 })
    })

    it('オブジェクト型のtoStringも動作する', () => {
      // Arrange（準備）
      const vo = new ObjectValueObject({ name: '太郎', age: 20 })

      // Act & Assert（実行 & 検証）
      expect(vo.toString()).toBe('[object Object]')
    })
  })
})
