import { describe, it, expect } from 'vitest'

import { GetCategoriesQuery } from '@/modules/ingredients/server/application/queries/get-categories.query'

/**
 * GetCategoriesQuery のテスト
 *
 * テスト対象:
 * - カテゴリー取得クエリオブジェクト
 * - クエリパラメータのカプセル化
 * - 将来的な拡張（フィルタリング、ソート）への対応
 */
describe('GetCategoriesQuery', () => {
  it('デフォルトパラメータでクエリを作成できる', () => {
    // デフォルトではdisplayOrder順で取得
    // Arrange & Act
    const query = new GetCategoriesQuery()

    // Assert
    expect(query.sortBy).toBe('displayOrder')
  })

  it('名前順でソートするクエリを作成できる', () => {
    // カテゴリー名でソートして取得するクエリ
    // Arrange & Act
    const query = new GetCategoriesQuery({ sortBy: 'name' })

    // Assert
    expect(query.sortBy).toBe('name')
  })

  it('イミュータブルなオブジェクトである', () => {
    // クエリオブジェクトは作成後に変更できない
    // Arrange
    const query = new GetCategoriesQuery()

    // Act & Assert
    expect(() => {
      // @ts-expect-error - イミュータビリティのテスト
      query.sortBy = 'name'
    }).toThrow()
  })

  it('JSONシリアライズ・デシリアライズができる', () => {
    // クエリオブジェクトのシリアライゼーションサポート
    // Arrange
    const originalQuery = new GetCategoriesQuery({
      sortBy: 'name',
    })

    // Act
    const json = originalQuery.toJSON()
    const restoredQuery = GetCategoriesQuery.fromJSON(json)

    // Assert
    expect(restoredQuery.sortBy).toBe(originalQuery.sortBy)
  })
})
