import { type NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

/**
 * GET /api/health
 *
 * ヘルスチェック用エンドポイント
 * Vercelデプロイ後の疎通確認やGitHub Actionsでの監視に使用
 * 認証不要で誰でもアクセス可能
 */
export async function GET(request: NextRequest) {
  try {
    // データベース接続チェック
    let databaseStatus = 'disconnected'
    let dbResponseTime = 0
    const dbStartTime = Date.now()

    try {
      // 軽量なクエリでデータベース接続を確認
      await prisma.$queryRaw`SELECT 1`
      dbResponseTime = Date.now() - dbStartTime
      databaseStatus = 'connected'
    } catch (error) {
      // データベース接続エラーは握りつぶして、ステータスのみ反映
      dbResponseTime = Date.now() - dbStartTime
      databaseStatus = 'error'
      // eslint-disable-next-line no-console
      console.warn('Database connection failed during health check:', error)
    }

    // パッケージ情報からバージョンを取得
    const packageJson = await import('../../../../package.json')
    const version = packageJson.version || '1.0.0'

    // 環境情報の取得
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || null
    const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null

    // URLパラメータで詳細レスポンスを制御
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    // 基本レスポンス
    const baseResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'all-in-one-api',
      version,
      environment,
    }

    // 詳細レスポンス（GitHub Actionsでのデバッグ用）
    if (detailed) {
      return NextResponse.json({
        ...baseResponse,
        database: {
          status: databaseStatus,
          responseTime: `${dbResponseTime}ms`,
        },
        deployment: {
          id: deploymentId,
          commit: commitSha,
          url: request.headers.get('host'),
        },
        checks: {
          ready: databaseStatus === 'connected',
          healthy: databaseStatus !== 'error',
        },
      })
    }

    // 簡潔なレスポンス
    return NextResponse.json({
      ...baseResponse,
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
