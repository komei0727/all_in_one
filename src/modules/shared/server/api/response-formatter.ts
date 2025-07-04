/**
 * API レスポンスフォーマッター
 * すべてのAPIレスポンスに共通のメタデータを付与する
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// package.jsonからバージョンを取得（キャッシュ）
let cachedVersion: string | null = null

/**
 * アプリケーションのバージョンを取得
 */
function getApplicationVersion(): string {
  if (cachedVersion) {
    return cachedVersion
  }

  try {
    const packageJsonPath = join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      version?: string
    }
    const version = packageJson.version || '1.0.0'
    cachedVersion = version
    return version
  } catch (error) {
    console.warn('バージョン情報の取得に失敗しました:', error)
    const fallbackVersion = '1.0.0'
    cachedVersion = fallbackVersion
    return fallbackVersion
  }
}

/**
 * レスポンスメタデータの型定義
 */
export interface ResponseMeta {
  timestamp: string
  version: string
}

/**
 * 共通レスポンスフォーマット
 */
export interface FormattedResponse<T = unknown> {
  data?: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    nextPage: number | null
    prevPage: number | null
  }
  meta: ResponseMeta
}

/**
 * エラーレスポンスフォーマット
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    type: 'BUSINESS_RULE_VIOLATION' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SYSTEM_ERROR'
    timestamp: string
    path: string
    details?: {
      rule?: string
      constraints?: Record<string, unknown>
      suggestions?: string[]
      fields?: Array<{
        field: string
        message: string
        code: string
      }>
    }
  }
  meta: {
    timestamp: string
    correlationId: string
  }
}

/**
 * ページネーション情報の型
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  nextPage: number | null
  prevPage: number | null
}

/**
 * レスポンスフォーマッター
 */
export class ResponseFormatter {
  /**
   * 成功レスポンスを生成
   */
  static success<T>(data?: T, pagination?: PaginationInfo): FormattedResponse<T> {
    const timestamp = new Date().toISOString()
    const version = getApplicationVersion()

    const response: FormattedResponse<T> = {
      meta: {
        timestamp,
        version,
      },
    }

    // データが存在する場合のみdataプロパティを追加
    if (data !== undefined) {
      response.data = data
    }

    // ページネーション情報が存在する場合のみpaginationプロパティを追加
    if (pagination) {
      response.pagination = pagination
    }

    return response
  }

  /**
   * ページ情報から標準的なページネーション情報を生成
   */
  static createPagination(page: number, limit: number, total: number): PaginationInfo {
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1
    const nextPage = hasNext ? page + 1 : null
    const prevPage = hasPrev ? page - 1 : null

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage,
      prevPage,
    }
  }

  /**
   * メタデータのみのレスポンスを生成（削除APIなど）
   */
  static meta(): Pick<FormattedResponse, 'meta'> {
    return {
      meta: {
        timestamp: new Date().toISOString(),
        version: getApplicationVersion(),
      },
    }
  }
}
