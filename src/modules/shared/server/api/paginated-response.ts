/**
 * ページネーション対応レスポンス
 */

import { ResponseFormatter, type PaginationInfo } from './response-formatter'

/**
 * ページネーション対応レスポンスヘルパー
 */
export class PaginatedResponse {
  /**
   * ページネーション付きレスポンスを作成
   * @param data データ配列
   * @param page 現在のページ
   * @param limit ページあたりの件数
   * @param total 総件数
   */
  static create<T>(data: T[], page: number, limit: number, total: number) {
    const pagination = ResponseFormatter.createPagination(page, limit, total)
    return ResponseFormatter.success(data, pagination)
  }

  /**
   * ページネーション情報のみを作成
   * @param page 現在のページ
   * @param limit ページあたりの件数
   * @param total 総件数
   */
  static createPagination(page: number, limit: number, total: number): PaginationInfo {
    return ResponseFormatter.createPagination(page, limit, total)
  }
}

/**
 * ページネーションクエリパラメータの型
 */
export interface PaginationQuery {
  page?: string | number
  limit?: string | number
}

/**
 * ページネーションパラメータのパーサー
 */
export class PaginationParser {
  /**
   * クエリパラメータからページネーション情報を解析
   */
  static parse(
    query: PaginationQuery,
    defaultLimit = 20,
    maxLimit = 100
  ): { page: number; limit: number } {
    const page = Math.max(1, parseInt(String(query.page || 1), 10) || 1)
    const requestedLimit = parseInt(String(query.limit || defaultLimit), 10) || defaultLimit
    const limit = Math.min(maxLimit, Math.max(1, requestedLimit))

    return { page, limit }
  }

  /**
   * ページネーション情報からオフセットを計算
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit
  }
}
