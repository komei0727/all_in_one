import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

/**
 * GET /api/health
 *
 * ヘルスチェック用エンドポイント
 * Vercelデプロイ後の疎通確認やGitHub Actionsでの監視に使用
 * 認証不要で誰でもアクセス可能
 */
export async function GET(_request: NextRequest) {
  try {
    // データベース接続チェック
    let databaseStatus = 'disconnected'
    try {
      // 軽量なクエリでデータベース接続を確認
      await prisma.$queryRaw`SELECT 1`
      databaseStatus = 'connected'
    } catch {
      // データベース接続エラーは握りつぶして、ステータスのみ反映
      databaseStatus = 'error'
    }

    // パッケージ情報からバージョンを取得
    const packageJson = await import('../../../../package.json')
    const version = packageJson.version || '1.0.0'

    // 成功レスポンス
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'all-in-one-api',
      version,
      database: databaseStatus,
    })
  } catch (error) {
    // 予期しないエラーが発生した場合
    // eslint-disable-next-line no-console
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'all-in-one-api',
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
