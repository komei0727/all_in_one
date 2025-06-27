import type { PrismaClient } from '@/generated/prisma'

import { Unit } from '../../domain/entities/unit.entity'

import type { UnitRepository } from '../../domain/repositories/unit-repository.interface'
import type { UnitId } from '../../domain/value-objects'

/**
 * PrismaUnitRepository
 *
 * Prismaを使用したUnitRepositoryの実装
 * Infrastructure層でDomain層のインターフェースを実装（依存性逆転の原則）
 */
export class PrismaUnitRepository implements UnitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * アクティブな単位を表示順で取得
   */
  async findAllActive(): Promise<Unit[]> {
    const units = await this.prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    // データベースのレコードをドメインエンティティに変換
    return units.map((unit) => {
      return new Unit({
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        type: unit.type,
        displayOrder: unit.displayOrder,
      })
    })
  }

  /**
   * IDによる単位の取得
   */
  async findById(id: UnitId): Promise<Unit | null> {
    const unit = await this.prisma.unit.findUnique({
      where: { id: id.getValue() },
    })

    if (!unit) {
      return null
    }

    // データベースのレコードをドメインエンティティに変換
    return new Unit({
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      type: unit.type,
      displayOrder: unit.displayOrder,
    })
  }
}
