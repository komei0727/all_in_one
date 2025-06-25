/**
 * 仕様パターンの基底クラス
 * ビジネスルールをオブジェクトとしてカプセル化し、
 * 複雑な条件を再利用可能な形で表現する
 */
export abstract class Specification<T> {
  /**
   * エンティティが仕様を満たすかどうかを判定
   * @param entity 判定対象のエンティティ
   * @returns 仕様を満たす場合はtrue
   */
  abstract isSatisfiedBy(entity: T): boolean

  /**
   * AND演算子で他の仕様と組み合わせる
   * @param other 組み合わせる仕様
   * @returns 両方の仕様を満たす新しい仕様
   */
  and(other: Specification<T>): Specification<T> {
    return new CompositeSpecification<T>(
      (entity) => this.isSatisfiedBy(entity) && other.isSatisfiedBy(entity)
    )
  }

  /**
   * OR演算子で他の仕様と組み合わせる
   * @param other 組み合わせる仕様
   * @returns どちらかの仕様を満たす新しい仕様
   */
  or(other: Specification<T>): Specification<T> {
    return new CompositeSpecification<T>(
      (entity) => this.isSatisfiedBy(entity) || other.isSatisfiedBy(entity)
    )
  }

  /**
   * NOT演算子で仕様を反転する
   * @returns 元の仕様を満たさない新しい仕様
   */
  not(): Specification<T> {
    return new CompositeSpecification<T>((entity) => !this.isSatisfiedBy(entity))
  }
}

/**
 * 複合仕様クラス
 * 関数として条件を受け取る汎用的な仕様実装
 */
class CompositeSpecification<T> extends Specification<T> {
  constructor(private readonly predicate: (entity: T) => boolean) {
    super()
  }

  isSatisfiedBy(entity: T): boolean {
    return this.predicate(entity)
  }
}
