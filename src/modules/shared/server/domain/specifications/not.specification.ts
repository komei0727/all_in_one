import { Specification } from './specification.base'

/**
 * NOT演算仕様
 * 元の仕様を満たさない場合にtrueを返す複合仕様
 */
export class NotSpecification<T> extends Specification<T> {
  constructor(private readonly specification: Specification<T>) {
    super()
  }

  /**
   * 元の仕様を満たさないかどうかを判定
   * @param entity 判定対象のエンティティ
   * @returns 元の仕様を満たさない場合はtrue
   */
  isSatisfiedBy(entity: T): boolean {
    return !this.specification.isSatisfiedBy(entity)
  }
}
