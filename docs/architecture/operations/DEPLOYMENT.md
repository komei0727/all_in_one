# デプロイメント戦略

## 概要

Enhanced Modular Monolithアーキテクチャのデプロイメント戦略ガイドです。コンテナ化、CI/CD、環境管理、ゼロダウンタイムデプロイなど、本番環境への安全なデプロイ方法を説明します。

## コンテナ化

### 1. マルチステージDockerfile

```dockerfile
# Dockerfile
# ========== ベースイメージ ==========
FROM node:20.19-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ========== 依存関係インストール ==========
FROM base AS deps
# package.jsonとlockファイルをコピー
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# pnpmをインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# 本番用依存関係をインストール
RUN pnpm install --frozen-lockfile --prod

# ========== ビルド用依存関係 ==========
FROM base AS dev-deps
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# ========== ビルドステージ ==========
FROM base AS builder
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Prismaクライアント生成
RUN npx prisma generate

# ビルド引数
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Next.jsアプリケーションをビルド
RUN pnpm build

# ========== 実行ステージ ==========
FROM base AS runner
WORKDIR /app

# セキュリティのため非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 必要なファイルをコピー
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 環境変数
ENV NODE_ENV=production
ENV PORT=3000

# ユーザー切り替え
USER nextjs

# ポート公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# アプリケーション起動
CMD ["node_modules/.bin/next", "start"]
```

### 2. Docker Compose（開発環境）

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@postgres:5432/food_management_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - postgres
      - redis
    command: pnpm dev

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=food_management_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # 開発用ツール
  prisma-studio:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev-deps
    ports:
      - "5555:5555"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/food_management_dev
    command: npx prisma studio
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

### 3. 本番用最適化

```dockerfile
# Dockerfile.prod
FROM node:20.19-alpine AS base

# 本番用の最適化
FROM base AS runner
WORKDIR /app

# tiniを追加（プロセス管理）
RUN apk add --no-cache tini

# アプリケーションファイル
COPY --chown=node:node . .

# キャッシュディレクトリ作成
RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next/cache

# セキュリティ設定
USER node

# tiniを使用してプロセスを起動
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

## CI/CDパイプライン

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.19'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          
      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT
          
      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-
            
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run tests
        run: |
          pnpm test
          pnpm type-check
          pnpm lint
          
      - name: Build application
        run: pnpm build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      
    steps:
      - uses: actions/checkout@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app
            docker compose pull
            docker compose up -d --no-deps --build app
            docker system prune -f
```

### 2. 環境別設定

```typescript
// config/environments.ts
export interface EnvironmentConfig {
  name: string
  apiUrl: string
  databaseUrl: string
  redisUrl: string
  logLevel: string
  features: {
    analytics: boolean
    notifications: boolean
    experimentalFeatures: boolean
  }
}

const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    apiUrl: 'http://localhost:3000',
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: 'redis://localhost:6379',
    logLevel: 'debug',
    features: {
      analytics: false,
      notifications: true,
      experimentalFeatures: true
    }
  },
  
  staging: {
    name: 'staging',
    apiUrl: 'https://staging.food-management.app',
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL!,
    logLevel: 'info',
    features: {
      analytics: true,
      notifications: true,
      experimentalFeatures: true
    }
  },
  
  production: {
    name: 'production',
    apiUrl: 'https://food-management.app',
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL!,
    logLevel: 'warn',
    features: {
      analytics: true,
      notifications: true,
      experimentalFeatures: false
    }
  }
}

export function getConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV || 'development'
  return environments[env] || environments.development
}
```

## データベースマイグレーション

### 1. マイグレーション戦略

```typescript
// scripts/migrate.ts
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

async function migrate() {
  console.log('Starting database migration...')
  
  try {
    // 1. バックアップを作成
    await createBackup()
    
    // 2. マイグレーションを実行
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
    console.log('Migration output:', stdout)
    if (stderr) console.error('Migration errors:', stderr)
    
    // 3. データ整合性チェック
    await verifyDataIntegrity()
    
    // 4. インデックスの再構築
    await rebuildIndexes()
    
    console.log('Migration completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    
    // ロールバック
    await rollback()
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = `backup-${timestamp}.sql`
  
  console.log(`Creating backup: ${backupFile}`)
  
  await execAsync(
    `pg_dump ${process.env.DATABASE_URL} > backups/${backupFile}`
  )
}

async function verifyDataIntegrity() {
  // 重要なデータの整合性チェック
  const checks = await Promise.all([
    prisma.ingredient.count(),
    prisma.category.count(),
    prisma.user.count()
  ])
  
  console.log('Data integrity check:', {
    ingredients: checks[0],
    categories: checks[1],
    users: checks[2]
  })
}

async function rebuildIndexes() {
  // パフォーマンスクリティカルなインデックスの再構築
  await prisma.$executeRaw`REINDEX TABLE "Ingredient"`
  await prisma.$executeRaw`ANALYZE "Ingredient"`
}

async function rollback() {
  console.error('Rolling back migration...')
  // 最新のバックアップから復元
  // 実装は環境に依存
}

// 実行
migrate().catch(console.error)
```

### 2. ゼロダウンタイムマイグレーション

```typescript
// scripts/zero-downtime-migration.ts
export class ZeroDowntimeMigration {
  async addColumn(table: string, column: string, definition: string) {
    // 1. 新しいカラムを追加（NULL許可）
    await prisma.$executeRaw`
      ALTER TABLE ${table} 
      ADD COLUMN IF NOT EXISTS ${column} ${definition}
    `
    
    // 2. アプリケーションをデプロイ（新旧両方のコードが動作）
    
    // 3. データをバックフィル
    await this.backfillData(table, column)
    
    // 4. NOT NULL制約を追加
    await prisma.$executeRaw`
      ALTER TABLE ${table} 
      ALTER COLUMN ${column} SET NOT NULL
    `
  }
  
  async renameColumn(table: string, oldName: string, newName: string) {
    // 1. 新しいカラムを追加
    await this.duplicateColumn(table, oldName, newName)
    
    // 2. トリガーで同期を保つ
    await this.createSyncTrigger(table, oldName, newName)
    
    // 3. アプリケーションを更新
    
    // 4. 古いカラムを削除
    await this.dropColumn(table, oldName)
  }
  
  private async createSyncTrigger(
    table: string, 
    source: string, 
    target: string
  ) {
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION sync_${table}_${source}_to_${target}()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.${target} = NEW.${source};
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER sync_${table}_columns
      BEFORE INSERT OR UPDATE ON ${table}
      FOR EACH ROW
      EXECUTE FUNCTION sync_${table}_${source}_to_${target}();
    `
  }
}
```

## 監視とロールバック

### 1. デプロイメント監視

```typescript
// scripts/deployment-monitor.ts
export class DeploymentMonitor {
  private metrics: Map<string, number> = new Map()
  
  async monitorDeployment(version: string) {
    console.log(`Monitoring deployment of version ${version}`)
    
    // 基準値を取得
    const baseline = await this.getBaselineMetrics()
    
    // デプロイ後の監視
    const interval = setInterval(async () => {
      const current = await this.getCurrentMetrics()
      
      // エラー率チェック
      if (current.errorRate > baseline.errorRate * 1.5) {
        console.error('Error rate increased significantly')
        await this.triggerRollback(version)
        clearInterval(interval)
        return
      }
      
      // レスポンスタイムチェック
      if (current.p95ResponseTime > baseline.p95ResponseTime * 2) {
        console.error('Response time degraded')
        await this.triggerRollback(version)
        clearInterval(interval)
        return
      }
      
      // CPU/メモリチェック
      if (current.cpuUsage > 80 || current.memoryUsage > 85) {
        console.warn('Resource usage high')
        await this.scaleUp()
      }
      
    }, 30000) // 30秒ごと
    
    // 30分後に監視終了
    setTimeout(() => {
      clearInterval(interval)
      console.log('Deployment monitoring completed successfully')
    }, 30 * 60 * 1000)
  }
  
  private async getBaselineMetrics() {
    return {
      errorRate: await this.getErrorRate(),
      p95ResponseTime: await this.getResponseTime(95),
      cpuUsage: await this.getCPUUsage(),
      memoryUsage: await this.getMemoryUsage()
    }
  }
  
  private async triggerRollback(version: string) {
    console.error(`Triggering rollback from version ${version}`)
    
    // 通知
    await this.notifyTeam('Automatic rollback triggered', {
      version,
      reason: 'Performance degradation detected'
    })
    
    // ロールバック実行
    await execAsync('./scripts/rollback.sh')
  }
}
```

### 2. カナリアデプロイ

```yaml
# k8s/canary-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: food-management-app
spec:
  selector:
    app: food-management
  ports:
    - port: 80
      targetPort: 3000

---
# 安定版
apiVersion: apps/v1
kind: Deployment
metadata:
  name: food-management-stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: food-management
      version: stable
  template:
    metadata:
      labels:
        app: food-management
        version: stable
    spec:
      containers:
      - name: app
        image: ghcr.io/org/food-management:stable
        ports:
        - containerPort: 3000
        env:
        - name: VERSION
          value: "stable"

---
# カナリア版
apiVersion: apps/v1
kind: Deployment
metadata:
  name: food-management-canary
spec:
  replicas: 1  # 10%のトラフィック
  selector:
    matchLabels:
      app: food-management
      version: canary
  template:
    metadata:
      labels:
        app: food-management
        version: canary
    spec:
      containers:
      - name: app
        image: ghcr.io/org/food-management:canary
        ports:
        - containerPort: 3000
        env:
        - name: VERSION
          value: "canary"

---
# Ingress with traffic splitting
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: food-management-ingress
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
  - host: food-management.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: food-management-app
            port:
              number: 80
```

## 災害復旧

### 1. バックアップ戦略

```bash
#!/bin/bash
# scripts/backup.sh

# 設定
BACKUP_DIR="/backups"
RETENTION_DAYS=30
S3_BUCKET="s3://food-management-backups"

# タイムスタンプ
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# データベースバックアップ
echo "Starting database backup..."
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# アプリケーションファイルバックアップ
echo "Backing up application files..."
tar -czf "$BACKUP_DIR/app_$TIMESTAMP.tar.gz" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  /app

# S3にアップロード
echo "Uploading to S3..."
aws s3 cp "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" "$S3_BUCKET/database/"
aws s3 cp "$BACKUP_DIR/app_$TIMESTAMP.tar.gz" "$S3_BUCKET/application/"

# 古いバックアップを削除
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
aws s3 ls "$S3_BUCKET" --recursive | \
  awk '{print $4}' | \
  while read file; do
    if [[ $(aws s3 ls "$S3_BUCKET/$file" | awk '{print $1}' | \
      xargs -I {} date -d {} +%s) -lt $(date -d "$RETENTION_DAYS days ago" +%s) ]]; then
      aws s3 rm "$S3_BUCKET/$file"
    fi
  done

echo "Backup completed successfully"
```

### 2. 復旧手順

```typescript
// scripts/disaster-recovery.ts
export class DisasterRecovery {
  async restore(backupId: string) {
    console.log(`Starting disaster recovery from backup ${backupId}`)
    
    try {
      // 1. サービスを停止
      await this.stopServices()
      
      // 2. バックアップをダウンロード
      await this.downloadBackup(backupId)
      
      // 3. データベースを復元
      await this.restoreDatabase(backupId)
      
      // 4. アプリケーションファイルを復元
      await this.restoreApplication(backupId)
      
      // 5. 設定を検証
      await this.validateConfiguration()
      
      // 6. サービスを開始
      await this.startServices()
      
      // 7. ヘルスチェック
      await this.performHealthCheck()
      
      console.log('Disaster recovery completed successfully')
    } catch (error) {
      console.error('Disaster recovery failed:', error)
      throw error
    }
  }
  
  private async downloadBackup(backupId: string) {
    await execAsync(`
      aws s3 cp s3://food-management-backups/database/db_${backupId}.sql.gz /tmp/
      aws s3 cp s3://food-management-backups/application/app_${backupId}.tar.gz /tmp/
    `)
  }
  
  private async restoreDatabase(backupId: string) {
    await execAsync(`
      gunzip -c /tmp/db_${backupId}.sql.gz | psql $DATABASE_URL
    `)
  }
  
  private async performHealthCheck() {
    const maxRetries = 30
    let retries = 0
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(`${APP_URL}/api/health`)
        if (response.ok) {
          console.log('Health check passed')
          return
        }
      } catch (error) {
        // 続行
      }
      
      retries++
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
    
    throw new Error('Health check failed after maximum retries')
  }
}
```

## 関連ドキュメント

- [監視・ログ設計](./MONITORING_LOGGING.md)
- [セキュリティ実装](./SECURITY.md)
- [パフォーマンス最適化](./PERFORMANCE_OPTIMIZATION.md)