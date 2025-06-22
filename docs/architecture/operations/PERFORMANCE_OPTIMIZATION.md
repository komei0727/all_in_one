# パフォーマンス最適化ガイド

## 概要

Enhanced Modular Monolithアーキテクチャにおけるパフォーマンス最適化の実装ガイドです。データベース、キャッシング、非同期処理、フロントエンド最適化など、システム全体のパフォーマンス向上手法を説明します。

## データベース最適化

### 1. インデックス戦略

```typescript
// prisma/schema.prisma
model Ingredient {
  id                String   @id @default(cuid())
  name              String
  categoryId        String
  quantity          Float
  unitId            String
  storageLocationType String
  expiryDate        DateTime?
  isOutOfStock      Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 複合インデックス
  @@index([categoryId, isOutOfStock])
  @@index([storageLocationType, expiryDate])
  @@index([name, categoryId])
  
  // 単一インデックス
  @@index([expiryDate])
  @@index([isOutOfStock])
  @@index([createdAt])
}

// Read Model用の非正規化テーブル
model IngredientView {
  id                String   @id
  name              String
  categoryName      String
  quantityDisplay   String
  storageDisplay    String
  expiryStatus      String
  daysUntilExpiry   Int?
  lastUpdated       DateTime

  // 検索・フィルタリング用インデックス
  @@index([categoryName, expiryStatus])
  @@index([expiryStatus, daysUntilExpiry])
  @@index([name(ops: raw("gin_trgm_ops"))]) // 全文検索用
}
```

### 2. クエリ最適化

```typescript
// src/modules/ingredients/server/infrastructure/repositories/optimized-ingredient.repository.ts
export class OptimizedIngredientRepository implements IngredientRepository {
  constructor(private readonly prisma: PrismaClient) {}
  
  // N+1問題を回避
  async findAllWithRelations(): Promise<Ingredient[]> {
    const results = await this.prisma.ingredient.findMany({
      include: {
        category: true,
        unit: true,
        // 必要な関連のみを選択的に取得
        stockHistory: {
          take: 5,
          orderBy: { recordedAt: 'desc' }
        }
      }
    })
    
    return results.map(r => this.mapper.toDomain(r))
  }
  
  // バッチ取得
  async findByIds(ids: string[]): Promise<Map<string, Ingredient>> {
    const results = await this.prisma.ingredient.findMany({
      where: { id: { in: ids } }
    })
    
    const map = new Map<string, Ingredient>()
    for (const result of results) {
      map.set(result.id, await this.mapper.toDomain(result))
    }
    
    return map
  }
  
  // ページネーション with カーソル
  async findPaginated(
    cursor?: string,
    limit: number = 20
  ): Promise<PaginatedResult<Ingredient>> {
    const query = {
      take: limit + 1, // +1 for hasMore check
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1 // カーソル自体をスキップ
      }),
      orderBy: { createdAt: 'desc' as const }
    }
    
    const results = await this.prisma.ingredient.findMany(query)
    
    const hasMore = results.length > limit
    const items = hasMore ? results.slice(0, -1) : results
    
    return {
      items: await Promise.all(items.map(i => this.mapper.toDomain(i))),
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : undefined
    }
  }
  
  // 集計クエリの最適化
  async getStatistics(): Promise<IngredientStatistics> {
    const [total, outOfStock, expiringSoon, byCategory] = await Promise.all([
      this.prisma.ingredient.count(),
      this.prisma.ingredient.count({ where: { isOutOfStock: true } }),
      this.prisma.ingredient.count({
        where: {
          expiryDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.ingredient.groupBy({
        by: ['categoryId'],
        _count: true
      })
    ])
    
    return {
      totalCount: total,
      outOfStockCount: outOfStock,
      expiringSoonCount: expiringSoon,
      countByCategory: byCategory.reduce((acc, item) => ({
        ...acc,
        [item.categoryId]: item._count
      }), {})
    }
  }
}
```

### 3. データベース接続プール

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// 接続プールの設定
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // 接続プール設定
    pool: {
      connectionLimit: 10,
      connectTimeout: 5000,
      waitForConnections: true,
      queueLimit: 0
    },
    // ログ設定（本番環境では最小限に）
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error']
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// シングルトンパターンで接続を再利用
const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma

// 接続の健全性チェック
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}
```

## キャッシング戦略

### 1. 多層キャッシュアーキテクチャ

```typescript
// src/modules/shared/infrastructure/caching/cache-manager.ts
export interface CacheLayer {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

export class CacheManager {
  constructor(
    private readonly layers: CacheLayer[]
  ) {}
  
  async get<T>(key: string): Promise<T | null> {
    // 各層を順番にチェック
    for (let i = 0; i < this.layers.length; i++) {
      const value = await this.layers[i].get<T>(key)
      
      if (value !== null) {
        // 上位層にキャッシュを復元
        for (let j = 0; j < i; j++) {
          await this.layers[j].set(key, value)
        }
        
        return value
      }
    }
    
    return null
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // 全層に書き込み
    await Promise.all(
      this.layers.map(layer => layer.set(key, value, ttl))
    )
  }
  
  async invalidate(pattern: string): Promise<void> {
    // パターンマッチングでキャッシュを無効化
    await Promise.all(
      this.layers.map(layer => layer.delete(pattern))
    )
  }
}

// メモリキャッシュ層
export class MemoryCacheLayer implements CacheLayer {
  private cache = new Map<string, { value: any; expiry?: number }>()
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + ttl * 1000 : undefined
    this.cache.set(key, { value, expiry })
  }
  
  async delete(key: string): Promise<void> {
    // パターンマッチング対応
    if (key.includes('*')) {
      const pattern = new RegExp(key.replace(/\*/g, '.*'))
      for (const [k] of this.cache) {
        if (pattern.test(k)) {
          this.cache.delete(k)
        }
      }
    } else {
      this.cache.delete(key)
    }
  }
  
  async clear(): Promise<void> {
    this.cache.clear()
  }
}

// Redisキャッシュ層
export class RedisCacheLayer implements CacheLayer {
  constructor(private readonly redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key)
    return value ? JSON.parse(value) : null
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    
    if (ttl) {
      await this.redis.setex(key, ttl, serialized)
    } else {
      await this.redis.set(key, serialized)
    }
  }
  
  async delete(key: string): Promise<void> {
    if (key.includes('*')) {
      const keys = await this.redis.keys(key)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } else {
      await this.redis.del(key)
    }
  }
  
  async clear(): Promise<void> {
    await this.redis.flushdb()
  }
}
```

### 2. キャッシュウォーミング

```typescript
// src/modules/ingredients/server/infrastructure/caching/cache-warmer.ts
export class IngredientCacheWarmer {
  constructor(
    private readonly repository: IngredientRepository,
    private readonly cache: CacheManager
  ) {}
  
  async warmUp(): Promise<void> {
    console.log('Starting cache warm-up...')
    
    // 頻繁にアクセスされるデータを事前にキャッシュ
    await Promise.all([
      this.warmCategories(),
      this.warmUnits(),
      this.warmPopularIngredients(),
      this.warmStatistics()
    ])
    
    console.log('Cache warm-up completed')
  }
  
  private async warmCategories(): Promise<void> {
    const categories = await this.repository.findAllCategories()
    await this.cache.set('categories:all', categories, 3600) // 1時間
  }
  
  private async warmPopularIngredients(): Promise<void> {
    // アクセス頻度の高い食材トップ20
    const popular = await this.repository.findMostAccessed(20)
    
    for (const ingredient of popular) {
      await this.cache.set(
        `ingredient:${ingredient.id.value}`,
        ingredient,
        1800 // 30分
      )
    }
  }
  
  private async warmStatistics(): Promise<void> {
    const stats = await this.repository.getStatistics()
    await this.cache.set('statistics:ingredients', stats, 300) // 5分
  }
}

// 起動時のキャッシュウォーミング
export async function startupCacheWarming(): Promise<void> {
  const warmer = new IngredientCacheWarmer(
    container.ingredientRepository,
    container.cacheManager
  )
  
  await warmer.warmUp()
  
  // 定期的な更新
  setInterval(() => {
    warmer.warmUp().catch(console.error)
  }, 30 * 60 * 1000) // 30分ごと
}
```

### 3. キャッシュ無効化戦略

```typescript
// src/modules/ingredients/server/infrastructure/caching/cache-invalidator.ts
export class CacheInvalidator {
  constructor(private readonly cache: CacheManager) {}
  
  // タグベースの無効化
  async invalidateByTags(tags: string[]): Promise<void> {
    const patterns = tags.map(tag => `*:tag:${tag}:*`)
    
    await Promise.all(
      patterns.map(pattern => this.cache.invalidate(pattern))
    )
  }
  
  // エンティティ更新時の無効化
  async onIngredientUpdated(ingredientId: string): Promise<void> {
    await Promise.all([
      // 個別エンティティ
      this.cache.delete(`ingredient:${ingredientId}`),
      
      // リスト系のキャッシュ
      this.cache.invalidate('ingredients:list:*'),
      
      // 統計情報
      this.cache.delete('statistics:ingredients'),
      
      // 関連するカテゴリのキャッシュ
      this.cache.invalidate(`ingredients:category:*`)
    ])
  }
  
  // スマート無効化（影響範囲を限定）
  async smartInvalidate(event: DomainEvent): Promise<void> {
    if (event instanceof IngredientConsumedEvent) {
      // 消費イベントの場合、数量関連のみ無効化
      await this.cache.delete(`ingredient:${event.aggregateId}`)
      await this.cache.delete('statistics:ingredients')
      
      // リストキャッシュは無効化しない（表示に影響なし）
    } else if (event instanceof IngredientCreatedEvent) {
      // 作成イベントの場合、全体を無効化
      await this.cache.invalidate('ingredients:*')
    }
  }
}
```

## 非同期処理

### 1. ワーカープール

```typescript
// src/modules/shared/infrastructure/workers/worker-pool.ts
export class WorkerPool<T, R> {
  private workers: Worker[] = []
  private queue: Array<{
    data: T
    resolve: (value: R) => void
    reject: (error: any) => void
  }> = []
  private busyWorkers = new Set<Worker>()
  
  constructor(
    private readonly workerPath: string,
    private readonly poolSize: number = 4
  ) {
    this.initializeWorkers()
  }
  
  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerPath)
      
      worker.on('message', (result: R) => {
        this.handleWorkerResult(worker, result)
      })
      
      worker.on('error', (error) => {
        this.handleWorkerError(worker, error)
      })
      
      this.workers.push(worker)
    }
  }
  
  async execute(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject })
      this.processQueue()
    })
  }
  
  private processQueue(): void {
    if (this.queue.length === 0) return
    
    const availableWorker = this.workers.find(
      w => !this.busyWorkers.has(w)
    )
    
    if (!availableWorker) return
    
    const task = this.queue.shift()!
    this.busyWorkers.add(availableWorker)
    
    availableWorker.postMessage(task.data)
  }
  
  private handleWorkerResult(worker: Worker, result: R): void {
    this.busyWorkers.delete(worker)
    
    // タスクの完了を通知
    const task = this.getTaskForWorker(worker)
    if (task) {
      task.resolve(result)
    }
    
    // 次のタスクを処理
    this.processQueue()
  }
  
  async terminate(): Promise<void> {
    await Promise.all(
      this.workers.map(w => w.terminate())
    )
  }
}

// ワーカー実装例
// src/modules/ingredients/server/infrastructure/workers/expiry-check.worker.ts
import { parentPort } from 'worker_threads'

parentPort?.on('message', async (ingredients: any[]) => {
  const results = ingredients.map(ingredient => {
    const daysUntilExpiry = calculateDaysUntilExpiry(ingredient.expiryDate)
    
    return {
      id: ingredient.id,
      status: getExpiryStatus(daysUntilExpiry),
      daysUntilExpiry,
      requiresNotification: daysUntilExpiry <= 3 && daysUntilExpiry >= 0
    }
  })
  
  parentPort?.postMessage(results)
})
```

### 2. ジョブキュー

```typescript
// src/modules/shared/infrastructure/queues/job-queue.ts
export interface Job<T = any> {
  id: string
  type: string
  data: T
  priority: number
  attempts: number
  maxAttempts: number
  createdAt: Date
  scheduledFor?: Date
}

export class JobQueue<T> {
  constructor(
    private readonly redis: Redis,
    private readonly queueName: string
  ) {}
  
  async enqueue(
    type: string,
    data: T,
    options: {
      priority?: number
      delay?: number
      maxAttempts?: number
    } = {}
  ): Promise<string> {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      type,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      scheduledFor: options.delay 
        ? new Date(Date.now() + options.delay)
        : undefined
    }
    
    const score = job.scheduledFor 
      ? job.scheduledFor.getTime()
      : Date.now() - job.priority * 1000
    
    await this.redis.zadd(
      `queue:${this.queueName}`,
      score,
      JSON.stringify(job)
    )
    
    return job.id
  }
  
  async dequeue(): Promise<Job<T> | null> {
    const now = Date.now()
    
    // スコアが現在時刻以下のジョブを取得
    const results = await this.redis.zrangebyscore(
      `queue:${this.queueName}`,
      '-inf',
      now,
      'WITHSCORES',
      'LIMIT',
      0,
      1
    )
    
    if (results.length === 0) return null
    
    const [jobData] = results
    
    // アトミックに削除
    const removed = await this.redis.zrem(
      `queue:${this.queueName}`,
      jobData
    )
    
    if (removed === 0) return null // 他のワーカーが先に取得
    
    return JSON.parse(jobData)
  }
  
  async requeue(job: Job<T>, delay: number = 0): Promise<void> {
    job.attempts++
    job.scheduledFor = new Date(Date.now() + delay)
    
    const score = job.scheduledFor.getTime()
    
    await this.redis.zadd(
      `queue:${this.queueName}`,
      score,
      JSON.stringify(job)
    )
  }
}

// ジョブプロセッサー
export class JobProcessor<T> {
  private isRunning = false
  
  constructor(
    private readonly queue: JobQueue<T>,
    private readonly handlers: Map<string, (data: T) => Promise<void>>
  ) {}
  
  async start(): Promise<void> {
    this.isRunning = true
    
    while (this.isRunning) {
      try {
        const job = await this.queue.dequeue()
        
        if (!job) {
          // ジョブがない場合は少し待機
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        
        await this.processJob(job)
      } catch (error) {
        console.error('Job processing error:', error)
      }
    }
  }
  
  private async processJob(job: Job<T>): Promise<void> {
    const handler = this.handlers.get(job.type)
    
    if (!handler) {
      console.error(`No handler for job type: ${job.type}`)
      return
    }
    
    try {
      await handler(job.data)
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error)
      
      if (job.attempts < job.maxAttempts) {
        // 指数バックオフで再試行
        const delay = Math.pow(2, job.attempts) * 1000
        await this.queue.requeue(job, delay)
      } else {
        // 最大試行回数に達した場合はDLQへ
        await this.moveToDeadLetterQueue(job, error)
      }
    }
  }
  
  stop(): void {
    this.isRunning = false
  }
}
```

## フロントエンド最適化

### 1. React Query設定

```typescript
// src/modules/shared/client/config/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // キャッシュ時間
      staleTime: 5 * 60 * 1000, // 5分
      cacheTime: 10 * 60 * 1000, // 10分
      
      // 再試行設定
      retry: (failureCount, error: any) => {
        // 4xx エラーは再試行しない
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      
      // バックグラウンド再取得
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      
      // サスペンス対応
      suspense: false
    },
    
    mutations: {
      // 楽観的更新のデフォルト設定
      retry: false,
      
      // エラー時の挙動
      onError: (error) => {
        console.error('Mutation error:', error)
      }
    }
  }
})

// プリフェッチング
export async function prefetchIngredients(): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: ['ingredients'],
    queryFn: fetchIngredients,
    staleTime: 10 * 60 * 1000 // 10分
  })
}

// 無限スクロール用のフック
export function useInfiniteIngredients() {
  return useInfiniteQuery({
    queryKey: ['ingredients', 'infinite'],
    queryFn: ({ pageParam = null }) => fetchIngredientPage(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000
  })
}
```

### 2. 楽観的更新

```typescript
// src/modules/ingredients/client/hooks/use-consume-ingredient.ts
export function useConsumeIngredient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: consumeIngredient,
    
    // 楽観的更新
    onMutate: async ({ ingredientId, amount }) => {
      // クエリをキャンセル
      await queryClient.cancelQueries(['ingredient', ingredientId])
      
      // 現在の値を保存
      const previousIngredient = queryClient.getQueryData<Ingredient>([
        'ingredient',
        ingredientId
      ])
      
      // 楽観的に更新
      if (previousIngredient) {
        queryClient.setQueryData(['ingredient', ingredientId], {
          ...previousIngredient,
          quantity: {
            ...previousIngredient.quantity,
            amount: previousIngredient.quantity.amount - amount
          }
        })
      }
      
      return { previousIngredient }
    },
    
    // エラー時のロールバック
    onError: (err, variables, context) => {
      if (context?.previousIngredient) {
        queryClient.setQueryData(
          ['ingredient', variables.ingredientId],
          context.previousIngredient
        )
      }
    },
    
    // 成功時の同期
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries(['ingredient', variables.ingredientId])
      queryClient.invalidateQueries(['ingredients'])
    }
  })
}
```

### 3. バンドルサイズ最適化

```typescript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  // 動的インポートの最適化
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mantine/core', '@mantine/hooks']
  },
  
  // webpack設定
  webpack: (config, { isServer }) => {
    // ツリーシェイキングの強化
    config.optimization.usedExports = true
    config.optimization.sideEffects = false
    
    // コード分割の最適化
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          
          // フレームワーク
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true
          },
          
          // 共通ライブラリ
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1]
              return `npm.${packageName.replace('@', '')}`
            },
            priority: 10,
            minChunks: 2
          },
          
          // 共通コンポーネント
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 0
          }
        }
      }
    }
    
    return config
  }
})

// 動的インポート
export const DynamicIngredientModal = dynamic(
  () => import('../components/IngredientModal').then(mod => mod.IngredientModal),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)
```

## モニタリングとプロファイリング

### 1. パフォーマンスメトリクス

```typescript
// src/modules/shared/infrastructure/monitoring/performance-monitor.ts
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>()
  
  startTimer(name: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(name, duration)
    }
  }
  
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(name, duration, 'error')
      throw error
    }
  }
  
  private recordMetric(
    name: string,
    duration: number,
    status: 'success' | 'error' = 'success'
  ): void {
    const metric = this.metrics.get(name) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: -Infinity,
      errors: 0
    }
    
    metric.count++
    metric.totalDuration += duration
    metric.minDuration = Math.min(metric.minDuration, duration)
    metric.maxDuration = Math.max(metric.maxDuration, duration)
    
    if (status === 'error') {
      metric.errors++
    }
    
    this.metrics.set(name, metric)
  }
  
  getReport(): PerformanceReport {
    const report: PerformanceReport = {}
    
    for (const [name, metric] of this.metrics) {
      report[name] = {
        averageDuration: metric.totalDuration / metric.count,
        minDuration: metric.minDuration,
        maxDuration: metric.maxDuration,
        count: metric.count,
        errorRate: metric.errors / metric.count
      }
    }
    
    return report
  }
}

// 使用例
const monitor = new PerformanceMonitor()

export class OptimizedIngredientService {
  async findIngredients(filters: any): Promise<Ingredient[]> {
    return monitor.measureAsync('findIngredients', async () => {
      // 実装
    })
  }
}
```

## 関連ドキュメント

- [監視・ログ設計](./MONITORING_LOGGING.md)
- [セキュリティ実装](./SECURITY.md)
- [デプロイメント戦略](./DEPLOYMENT.md)