import { describe, it, expect } from 'vitest'

import { Specification } from '@/modules/shared/server/domain/specifications/specification.base'

// テスト用の具象仕様クラス
class TrueSpecification<T> extends Specification<T> {
  isSatisfiedBy(_entity: T): boolean {
    return true
  }
}

class FalseSpecification<T> extends Specification<T> {
  isSatisfiedBy(_entity: T): boolean {
    return false
  }
}

// テスト用のエンティティ
interface TestEntity {
  value: number
}

class GreaterThanSpecification extends Specification<TestEntity> {
  constructor(private readonly threshold: number) {
    super()
  }

  isSatisfiedBy(entity: TestEntity): boolean {
    return entity.value > this.threshold
  }
}

class LessThanSpecification extends Specification<TestEntity> {
  constructor(private readonly threshold: number) {
    super()
  }

  isSatisfiedBy(entity: TestEntity): boolean {
    return entity.value < this.threshold
  }
}

describe('Specification基底クラス', () => {
  describe('基本的な仕様の動作', () => {
    it('具象仕様クラスが正しく動作する', () => {
      // 仕様パターンの基本的な動作を確認
      const trueSpec = new TrueSpecification<TestEntity>()
      const falseSpec = new FalseSpecification<TestEntity>()
      const entity = { value: 10 }

      // Assert
      expect(trueSpec.isSatisfiedBy(entity)).toBe(true)
      expect(falseSpec.isSatisfiedBy(entity)).toBe(false)
    })

    it('値による条件判定が正しく動作する', () => {
      // 値を使った条件判定が正しく動作することを確認
      const greaterThan5 = new GreaterThanSpecification(5)
      const lessThan15 = new LessThanSpecification(15)

      const entity1 = { value: 3 }
      const entity2 = { value: 10 }
      const entity3 = { value: 20 }

      // Assert
      expect(greaterThan5.isSatisfiedBy(entity1)).toBe(false)
      expect(greaterThan5.isSatisfiedBy(entity2)).toBe(true)
      expect(greaterThan5.isSatisfiedBy(entity3)).toBe(true)

      expect(lessThan15.isSatisfiedBy(entity1)).toBe(true)
      expect(lessThan15.isSatisfiedBy(entity2)).toBe(true)
      expect(lessThan15.isSatisfiedBy(entity3)).toBe(false)
    })
  })

  describe('AND演算', () => {
    it('and()メソッドでAND仕様を作成できる', () => {
      // AND演算が正しく動作することを確認
      const greaterThan5 = new GreaterThanSpecification(5)
      const lessThan15 = new LessThanSpecification(15)
      const between5And15 = greaterThan5.and(lessThan15)

      // Assert
      expect(between5And15).toBeInstanceOf(Specification)
    })

    it('AND仕様が両方の条件を満たす場合のみtrueを返す', () => {
      // AND演算の真理値表を確認
      const greaterThan5 = new GreaterThanSpecification(5)
      const lessThan15 = new LessThanSpecification(15)
      const between5And15 = greaterThan5.and(lessThan15)

      const entity1 = { value: 3 } // false AND true = false
      const entity2 = { value: 10 } // true AND true = true
      const entity3 = { value: 20 } // true AND false = false

      // Assert
      expect(between5And15.isSatisfiedBy(entity1)).toBe(false)
      expect(between5And15.isSatisfiedBy(entity2)).toBe(true)
      expect(between5And15.isSatisfiedBy(entity3)).toBe(false)
    })
  })

  describe('OR演算', () => {
    it('or()メソッドでOR仕様を作成できる', () => {
      // OR演算が正しく動作することを確認
      const lessThan5 = new LessThanSpecification(5)
      const greaterThan15 = new GreaterThanSpecification(15)
      const outsideRange = lessThan5.or(greaterThan15)

      // Assert
      expect(outsideRange).toBeInstanceOf(Specification)
    })

    it('OR仕様がどちらか一方の条件を満たす場合にtrueを返す', () => {
      // OR演算の真理値表を確認
      const lessThan5 = new LessThanSpecification(5)
      const greaterThan15 = new GreaterThanSpecification(15)
      const outsideRange = lessThan5.or(greaterThan15)

      const entity1 = { value: 3 } // true OR false = true
      const entity2 = { value: 10 } // false OR false = false
      const entity3 = { value: 20 } // false OR true = true

      // Assert
      expect(outsideRange.isSatisfiedBy(entity1)).toBe(true)
      expect(outsideRange.isSatisfiedBy(entity2)).toBe(false)
      expect(outsideRange.isSatisfiedBy(entity3)).toBe(true)
    })
  })

  describe('NOT演算', () => {
    it('not()メソッドでNOT仕様を作成できる', () => {
      // NOT演算が正しく動作することを確認
      const greaterThan10 = new GreaterThanSpecification(10)
      const notGreaterThan10 = greaterThan10.not()

      // Assert
      expect(notGreaterThan10).toBeInstanceOf(Specification)
    })

    it('NOT仕様が条件を反転させる', () => {
      // NOT演算の動作を確認
      const greaterThan10 = new GreaterThanSpecification(10)
      const notGreaterThan10 = greaterThan10.not()

      const entity1 = { value: 5 } // NOT false = true
      const entity2 = { value: 15 } // NOT true = false

      // Assert
      expect(notGreaterThan10.isSatisfiedBy(entity1)).toBe(true)
      expect(notGreaterThan10.isSatisfiedBy(entity2)).toBe(false)
    })
  })

  describe('複雑な組み合わせ', () => {
    it('複数の論理演算を組み合わせられる', () => {
      // 複雑な条件を表現できることを確認
      const greaterThan5 = new GreaterThanSpecification(5)
      const lessThan15 = new LessThanSpecification(15)
      const greaterThan20 = new GreaterThanSpecification(20)

      // (5 < value < 15) OR (value > 20)
      const complexSpec = greaterThan5.and(lessThan15).or(greaterThan20)

      const entity1 = { value: 3 } // false
      const entity2 = { value: 10 } // true (5 < 10 < 15)
      const entity3 = { value: 17 } // false
      const entity4 = { value: 25 } // true (25 > 20)

      // Assert
      expect(complexSpec.isSatisfiedBy(entity1)).toBe(false)
      expect(complexSpec.isSatisfiedBy(entity2)).toBe(true)
      expect(complexSpec.isSatisfiedBy(entity3)).toBe(false)
      expect(complexSpec.isSatisfiedBy(entity4)).toBe(true)
    })

    it('NOTを含む複雑な組み合わせが動作する', () => {
      // NOT演算を含む複雑な条件を確認
      const greaterThan10 = new GreaterThanSpecification(10)
      const lessThan20 = new LessThanSpecification(20)

      // NOT (10 < value < 20) = (value <= 10) OR (value >= 20)
      const notBetween10And20 = greaterThan10.and(lessThan20).not()

      const entity1 = { value: 5 } // true
      const entity2 = { value: 15 } // false
      const entity3 = { value: 25 } // true

      // Assert
      expect(notBetween10And20.isSatisfiedBy(entity1)).toBe(true)
      expect(notBetween10And20.isSatisfiedBy(entity2)).toBe(false)
      expect(notBetween10And20.isSatisfiedBy(entity3)).toBe(true)
    })
  })

  describe('仕様の再利用性', () => {
    it('作成した仕様を再利用できる', () => {
      // 仕様オブジェクトが再利用可能であることを確認
      const between5And15 = new GreaterThanSpecification(5).and(new LessThanSpecification(15))

      const entities = [{ value: 3 }, { value: 10 }, { value: 20 }]

      // 同じ仕様を複数のエンティティに適用
      const results = entities.map((entity) => between5And15.isSatisfiedBy(entity))

      // Assert
      expect(results).toEqual([false, true, false])
    })

    it('仕様をフィルタリング条件として使用できる', () => {
      // 仕様パターンを配列のフィルタリングに使用
      const greaterThan10 = new GreaterThanSpecification(10)

      const entities = [{ value: 5 }, { value: 15 }, { value: 8 }, { value: 20 }, { value: 3 }]

      // フィルタリング
      const filtered = entities.filter((entity) => greaterThan10.isSatisfiedBy(entity))

      // Assert
      expect(filtered).toEqual([{ value: 15 }, { value: 20 }])
    })
  })
})
