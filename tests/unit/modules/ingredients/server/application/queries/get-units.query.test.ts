import { describe, it, expect } from 'vitest'

import { GetUnitsQuery } from '@/modules/ingredients/server/application/queries/get-units.query'

/**
 * GetUnitsQuery のテスト
 *
 * テスト対象:
 * - 単位取得クエリオブジェクト
 * - クエリパラメータのカプセル化
 * - 将来的な拡張（フィルタリング、グルーピング）への対応
 */
describe('GetUnitsQuery', () => {
  it('デフォルトパラメータでクエリを作成できる', () => {
    // デフォルトではdisplayOrder順で取得
    // Arrange & Act
    const query = new GetUnitsQuery()

    // Assert
    expect(query.sortBy).toBe('displayOrder')
    expect(query.groupByType).toBe(false)
  })

  it('名前順でソートするクエリを作成できる', () => {
    // 単位名でソートして取得するクエリ
    // Arrange & Act
    const query = new GetUnitsQuery({ sortBy: 'name' })

    // Assert
    expect(query.sortBy).toBe('name')
    expect(query.groupByType).toBe(false)
  })

  it('記号順でソートするクエリを作成できる', () => {
    // 単位記号でソートして取得するクエリ
    // Arrange & Act
    const query = new GetUnitsQuery({ sortBy: 'symbol' })

    // Assert
    expect(query.sortBy).toBe('symbol')
    expect(query.groupByType).toBe(false)
  })

  it('タイプ別にグループ化するクエリを作成できる', () => {
    // 重量、体積などのタイプ別にグループ化して取得するクエリ
    // Arrange & Act
    const query = new GetUnitsQuery({ groupByType: true })

    // Assert
    expect(query.sortBy).toBe('displayOrder')
    expect(query.groupByType).toBe(true)
  })

  it('すべてのパラメータを指定してクエリを作成できる', () => {
    // すべてのパラメータを明示的に指定
    // Arrange & Act
    const query = new GetUnitsQuery({
      sortBy: 'name',
      groupByType: true,
    })

    // Assert
    expect(query.sortBy).toBe('name')
    expect(query.groupByType).toBe(true)
  })

  it('イミュータブルなオブジェクトである', () => {
    // クエリオブジェクトは作成後に変更できない
    // Arrange
    const query = new GetUnitsQuery()

    // Act & Assert
    expect(() => {
      // @ts-expect-error - イミュータビリティのテスト
      query.sortBy = 'name'
    }).toThrow()
  })

  it('JSONシリアライズ・デシリアライズができる', () => {
    // クエリオブジェクトのシリアライゼーションサポート
    // Arrange
    const originalQuery = new GetUnitsQuery({
      sortBy: 'symbol',
      groupByType: true,
    })

    // Act
    const json = originalQuery.toJSON()
    const restoredQuery = GetUnitsQuery.fromJSON(json)

    // Assert
    expect(restoredQuery.sortBy).toBe(originalQuery.sortBy)
    expect(restoredQuery.groupByType).toBe(originalQuery.groupByType)
  })
})
