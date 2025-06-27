import { describe, it, expect } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/shared/server/domain/exceptions'
import { Name } from '@/modules/shared/server/domain/value-objects'

// テスト用の具象クラス
class TestName extends Name {
  protected getFieldName(): string {
    return 'テスト名'
  }

  protected getMaxLength(): number {
    return 10
  }
}

// 最小文字数をカスタマイズしたテスト用クラス
class TestNameWithMinLength extends Name {
  protected getFieldName(): string {
    return 'テスト名（最小3文字）'
  }

  protected getMaxLength(): number {
    return 10
  }

  protected getMinLength(): number {
    return 3
  }
}

describe('Name基底クラス', () => {
  describe('正常な値での作成', () => {
    it('有効な名前で作成できる', () => {
      // Arrange
      const value = 'テスト名前'

      // Act
      const name = new TestName(value)

      // Assert
      expect(name.getValue()).toBe('テスト名前')
    })

    it('前後の空白が自動的にトリミングされる', () => {
      // Arrange
      const valueWithSpaces = '  テスト  '

      // Act
      const name = new TestName(valueWithSpaces)

      // Assert
      expect(name.getValue()).toBe('テスト')
    })

    it('最大文字数ちょうどで作成できる', () => {
      // Arrange
      const maxLengthValue = '1234567890' // 10文字

      // Act
      const name = new TestName(maxLengthValue)

      // Assert
      expect(name.getValue()).toBe('1234567890')
    })

    it('コンストラクタで同一の値を持つインスタンスを作成できる', () => {
      // Arrange
      const value = '同じ値'

      // Act
      const name1 = new TestName(value)
      const name2 = new TestName(value)

      // Assert
      expect(name1.getValue()).toBe(name2.getValue())
    })
  })

  describe('不正な値での作成', () => {
    it('空文字で作成するとエラーが発生する', () => {
      // Arrange
      const emptyValue = ''

      // Act & Assert
      expect(() => new TestName(emptyValue)).toThrow(RequiredFieldException)
      expect(() => new TestName(emptyValue)).toThrow('テスト名は必須です')
    })

    it('空白のみの文字列で作成するとエラーが発生する', () => {
      // Arrange
      const spacesOnly = '   '

      // Act & Assert
      expect(() => new TestName(spacesOnly)).toThrow(RequiredFieldException)
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange
      const nullValue = null as any

      // Act & Assert
      expect(() => new TestName(nullValue)).toThrow(RequiredFieldException)
      expect(() => new TestName(nullValue)).toThrow('値は必須です')
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange
      const undefinedValue = undefined as any

      // Act & Assert
      expect(() => new TestName(undefinedValue)).toThrow(RequiredFieldException)
      expect(() => new TestName(undefinedValue)).toThrow('値は必須です')
    })

    it('最大文字数を超えるとエラーが発生する', () => {
      // Arrange
      const tooLongValue = '12345678901' // 11文字

      // Act & Assert
      expect(() => new TestName(tooLongValue)).toThrow(InvalidFieldException)
      expect(() => new TestName(tooLongValue)).toThrow('テスト名は10文字以内で入力してください')
    })

    it('最小文字数未満だとエラーが発生する', () => {
      // Arrange
      const tooShortValue = 'ab' // 2文字

      // Act & Assert
      expect(() => new TestNameWithMinLength(tooShortValue)).toThrow(InvalidFieldException)
      expect(() => new TestNameWithMinLength(tooShortValue)).toThrow(
        'テスト名（最小3文字）は3文字以上で入力してください'
      )
    })
  })

  describe('等価性比較', () => {
    it('同じ値のNameは等しい', () => {
      // Arrange
      const value = '同じ名前'
      const name1 = new TestName(value)
      const name2 = new TestName(value)

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('異なる値のNameは等しくない', () => {
      // Arrange
      const name1 = new TestName('名前1')
      const name2 = new TestName('名前2')

      // Act & Assert
      expect(name1.equals(name2)).toBe(false)
    })

    it('Name以外のオブジェクトとは等しくない', () => {
      // Arrange
      const name = new TestName('テスト')
      const other = { value: 'テスト' } as any

      // Act & Assert
      expect(name.equals(other)).toBe(false)
    })

    it('トリミング後の値で比較される', () => {
      // Arrange
      const name1 = new TestName('テスト')
      const name2 = new TestName('  テスト  ')

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })
  })

  describe('デフォルトの最小文字数', () => {
    it('デフォルトでは最小文字数は1', () => {
      // Arrange
      const singleChar = 'a'

      // Act
      const name = new TestName(singleChar)

      // Assert
      expect(name.getValue()).toBe('a')
    })
  })

  describe('文字列変換', () => {
    it('toString()で名前の値が取得できる', () => {
      // Arrange
      const value = 'テスト名前'
      const name = new TestName(value)

      // Act & Assert
      expect(name.toString()).toBe('テスト名前')
    })
  })
})
