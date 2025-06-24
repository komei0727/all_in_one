import { PrismaClient } from '@/generated/prisma'

import { Category } from '../../domain/entities/category.entity'
import { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import { CategoryId } from '../../domain/value-objects'

/**
 * PrismaCategoryRepository
 *
 * Prismaを使用したCategoryRepositoryの実装
 * Infrastructure層でDomain層のインターフェースを実装（依存性逆転の原則）
 */
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * アクティブなカテゴリーを表示順で取得
   */
  async findAllActive(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    // データベースのレコードをドメインエンティティに変換
    return categories.map((cat) => {
      return new Category({
        id: cat.id,
        name: cat.name,
        displayOrder: cat.displayOrder,
      })
    })
  }

  /**
   * IDによるカテゴリーの取得
   */
  async findById(id: CategoryId): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: { id: id.getValue() },
    })

    if (!category) {
      return null
    }

    // データベースのレコードをドメインエンティティに変換
    return new Category({
      id: category.id,
      name: category.name,
      displayOrder: category.displayOrder,
    })
  }
}
