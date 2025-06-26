import { Specification } from './specification.base'

/**
 * OR演算仕様
 * 2つの仕様のどちらか一方を満たす場合にtrueを返す複合仕様
 */
export class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {
    super()
  }

  /**
   * どちらかの仕様を満たすかどうかを判定
   * @param entity 判定対象のエンティティ
   * @returns どちらかの仕様を満たす場合はtrue
   */
  isSatisfiedBy(entity: T): boolean {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity)
  }
}
