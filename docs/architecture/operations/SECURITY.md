# セキュリティ実装ガイド

## 概要

Enhanced Modular Monolithアーキテクチャにおけるセキュリティの実装ガイドです。認証・認可、入力検証、データ保護など、アプリケーションセキュリティの包括的な実装方法を説明します。

## 認証・認可

### 1. JWT認証の実装

```typescript
// src/modules/auth/server/infrastructure/jwt.service.ts
import jwt from 'jsonwebtoken'

export interface JWTPayload {
  userId: string
  email: string
  roles: string[]
}

export class JWTService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = '24h'
  ) {}
  
  async sign(payload: JWTPayload): Promise<string> {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'food-management-app',
      audience: 'food-management-users'
    })
  }
  
  async verify(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'food-management-app',
        audience: 'food-management-users'
      }) as JWTPayload
      
      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('トークンの有効期限が切れています')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('無効なトークンです')
      }
      throw error
    }
  }
  
  async refresh(token: string): Promise<string> {
    const payload = await this.verify(token)
    
    // ユーザーの状態を再確認
    const user = await this.userRepository.findById(payload.userId)
    if (!user || !user.isActive) {
      throw new AuthenticationError('ユーザーが無効です')
    }
    
    // 新しいトークンを発行
    return this.sign({
      userId: user.id,
      email: user.email,
      roles: user.roles
    })
  }
}
```

### 2. 認証ミドルウェア

```typescript
// src/modules/auth/server/infrastructure/middleware/auth.middleware.ts
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

export interface AuthenticatedUser {
  id: string
  email: string
  roles: string[]
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  context: any,
  next: () => Promise<Response>
): Promise<Response> {
  const token = extractToken(request)
  
  if (!token) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    )
  }
  
  try {
    const jwtService = new JWTService(process.env.JWT_SECRET!)
    const payload = await jwtService.verify(token)
    
    // リクエストにユーザー情報を追加
    request.user = {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles
    }
    
    return next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null
  
  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer') return null
  
  return token
}
```

### 3. 認可デコレーター

```typescript
// src/modules/auth/server/infrastructure/decorators/authorize.decorator.ts
export function Authorize(...requiredRoles: string[]) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const context = args[1] as { user?: AuthenticatedUser }
      
      if (!context.user) {
        throw new AuthorizationError('認証が必要です')
      }
      
      if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(role =>
          context.user!.roles.includes(role)
        )
        
        if (!hasRequiredRole) {
          throw new AuthorizationError('権限が不足しています')
        }
      }
      
      return originalMethod.apply(this, args)
    }
  }
}

// 使用例
export class AdminIngredientHandler {
  @Authorize('admin')
  async deleteIngredient(
    command: DeleteIngredientCommand,
    context: { user: AuthenticatedUser }
  ): Promise<void> {
    // 管理者のみ実行可能
  }
}
```

## 入力検証

### 1. Zodスキーマによる検証

```typescript
// src/modules/ingredients/server/api/validators/ingredient.validators.ts
import { z } from 'zod'

// カスタムバリデーター
const noControlChars = z.string().refine(
  (val) => !/[\x00-\x1f]/.test(val),
  { message: '制御文字は使用できません' }
)

const positiveNumber = z.number().refine(
  (val) => val > 0,
  { message: '正の数を入力してください' }
)

// 食材作成スキーマ
export const createIngredientSchema = z.object({
  name: noControlChars
    .min(1, '食材名は必須です')
    .max(50, '食材名は50文字以下で入力してください')
    .trim(),
  
  quantity: z.object({
    amount: positiveNumber
      .max(999999, '数量は999,999以下で入力してください')
      .multipleOf(0.01, '小数点以下は2桁までです'),
    unitId: z.string().uuid('正しい単位IDを指定してください')
  }),
  
  categoryId: z.string().uuid('正しいカテゴリIDを指定してください'),
  
  storageLocation: z.object({
    type: z.enum(['REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE'], {
      errorMap: () => ({ message: '正しい保存場所を選択してください' })
    }),
    detail: z.string().max(50).optional()
  }),
  
  expiryDate: z.string().datetime().optional().refine(
    (val) => !val || new Date(val) > new Date(),
    { message: '賞味期限は未来の日付を指定してください' }
  )
})

// SQLインジェクション対策
export const searchQuerySchema = z.object({
  q: z.string()
    .max(100)
    .transform(val => val.replace(/[%_]/g, '\\$&')) // SQLワイルドカードをエスケープ
})
```

### 2. サニタイゼーション

```typescript
// src/modules/shared/infrastructure/security/sanitizer.ts
import DOMPurify from 'isomorphic-dompurify'

export class Sanitizer {
  // HTMLサニタイゼーション
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href']
    })
  }
  
  // ファイル名サニタイゼーション
  static sanitizeFileName(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/^\.+/, '') // 先頭のドットを削除
      .substring(0, 255)
  }
  
  // JSONサニタイゼーション
  static sanitizeJSON(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }
    
    const sanitized: any = Array.isArray(obj) ? [] : {}
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const sanitizedKey = key.replace(/[^\w.-]/g, '_')
        
        if (typeof obj[key] === 'string') {
          sanitized[sanitizedKey] = this.sanitizeString(obj[key])
        } else if (typeof obj[key] === 'object') {
          sanitized[sanitizedKey] = this.sanitizeJSON(obj[key])
        } else {
          sanitized[sanitizedKey] = obj[key]
        }
      }
    }
    
    return sanitized
  }
  
  // 文字列の基本的なサニタイゼーション
  static sanitizeString(input: string): string {
    return input
      .replace(/[\x00-\x1f]/g, '') // 制御文字を削除
      .trim()
  }
}
```

## データ保護

### 1. 暗号化

```typescript
// src/modules/shared/infrastructure/security/encryption.service.ts
import crypto from 'crypto'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16
  private readonly tagLength = 16
  private readonly saltLength = 64
  private readonly iterations = 100000
  
  constructor(private readonly masterKey: string) {}
  
  // データ暗号化
  async encrypt(data: string): Promise<string> {
    const salt = crypto.randomBytes(this.saltLength)
    const key = crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    )
    
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipheriv(this.algorithm, key, iv)
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ])
    
    const tag = cipher.getAuthTag()
    
    // salt + iv + tag + encrypted data を結合
    const combined = Buffer.concat([salt, iv, tag, encrypted])
    
    return combined.toString('base64')
  }
  
  // データ復号化
  async decrypt(encryptedData: string): Promise<string> {
    const combined = Buffer.from(encryptedData, 'base64')
    
    const salt = combined.slice(0, this.saltLength)
    const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength)
    const tag = combined.slice(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    )
    const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength)
    
    const key = crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    )
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv)
    decipher.setAuthTag(tag)
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
    
    return decrypted.toString('utf8')
  }
  
  // ハッシュ化（一方向）
  async hash(data: string): Promise<string> {
    const salt = crypto.randomBytes(this.saltLength)
    const hash = crypto.pbkdf2Sync(
      data,
      salt,
      this.iterations,
      64,
      'sha256'
    )
    
    return salt.toString('hex') + ':' + hash.toString('hex')
  }
  
  // ハッシュ検証
  async verifyHash(data: string, hashedData: string): Promise<boolean> {
    const [salt, hash] = hashedData.split(':')
    const hashBuffer = Buffer.from(hash, 'hex')
    
    const dataHash = crypto.pbkdf2Sync(
      data,
      Buffer.from(salt, 'hex'),
      this.iterations,
      64,
      'sha256'
    )
    
    return crypto.timingSafeEqual(hashBuffer, dataHash)
  }
}
```

### 2. 個人情報保護

```typescript
// src/modules/users/server/domain/value-objects/personal-info.vo.ts
export class PersonalInfo extends ValueObject<{
  email: string
  phone?: string
  address?: string
}> {
  // 個人情報のマスキング
  toPublicView(): {
    email: string
    phone?: string
    address?: string
  } {
    return {
      email: this.maskEmail(this._value.email),
      phone: this._value.phone ? this.maskPhone(this._value.phone) : undefined,
      address: this._value.address ? this.maskAddress(this._value.address) : undefined
    }
  }
  
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1)
    return `${maskedLocal}@${domain}`
  }
  
  private maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
  
  private maskAddress(address: string): string {
    // 最初の部分のみ表示
    const parts = address.split(' ')
    return parts[0] + ' *****'
  }
}

// PIIアノテーション
export function PII(target: any, propertyKey: string) {
  Reflect.defineMetadata('isPII', true, target, propertyKey)
}

export class User {
  @PII
  private email: string
  
  @PII
  private phoneNumber?: string
  
  // PIIフィールドを自動的にマスク
  toJSON(): any {
    const result: any = {}
    
    for (const key of Object.keys(this)) {
      const isPII = Reflect.getMetadata('isPII', this, key)
      
      if (isPII) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = (this as any)[key]
      }
    }
    
    return result
  }
}
```

## CSRF対策

```typescript
// src/modules/shared/infrastructure/security/csrf.service.ts
export class CSRFService {
  private readonly tokenLength = 32
  
  generateToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex')
  }
  
  async validateToken(token: string, sessionToken: string): Promise<boolean> {
    if (!token || !sessionToken) return false
    
    // タイミング攻撃対策のため、固定時間で比較
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken)
    )
  }
}

// CSRFミドルウェア
export async function csrfMiddleware(
  request: Request,
  context: any,
  next: () => Promise<Response>
): Promise<Response> {
  // GETリクエストはスキップ
  if (request.method === 'GET' || request.method === 'HEAD') {
    return next()
  }
  
  const csrfToken = request.headers.get('X-CSRF-Token')
  const sessionToken = await getSessionCSRFToken(request)
  
  const csrfService = new CSRFService()
  const isValid = await csrfService.validateToken(csrfToken!, sessionToken!)
  
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }
  
  return next()
}
```

## レート制限

```typescript
// src/modules/shared/infrastructure/security/rate-limiter.ts
export class RateLimiter {
  private requests = new Map<string, number[]>()
  
  constructor(
    private readonly windowMs: number = 60000, // 1分
    private readonly maxRequests: number = 100
  ) {}
  
  async isAllowed(identifier: string): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    // 古いリクエストを削除
    const requests = this.requests.get(identifier) || []
    const validRequests = requests.filter(time => time > windowStart)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
  
  // Redis実装
  async isAllowedRedis(identifier: string): Promise<boolean> {
    const key = `rate_limit:${identifier}`
    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, Math.ceil(this.windowMs / 1000))
    }
    
    return current <= this.maxRequests
  }
}

// レート制限ミドルウェア
export async function rateLimitMiddleware(
  request: Request,
  context: any,
  next: () => Promise<Response>
): Promise<Response> {
  const identifier = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
  
  const limiter = new RateLimiter()
  const allowed = await limiter.isAllowed(identifier)
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      }
    )
  }
  
  return next()
}
```

## セキュリティヘッダー

```typescript
// src/modules/shared/infrastructure/security/security-headers.middleware.ts
export async function securityHeadersMiddleware(
  request: Request,
  context: any,
  next: () => Promise<Response>
): Promise<Response> {
  const response = await next()
  
  // セキュリティヘッダーを追加
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.example.com"
  )
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )
  
  // HSTS (HTTPS環境のみ)
  if (request.url.startsWith('https://')) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }
  
  return response
}
```

## 監査ログ

```typescript
// src/modules/shared/infrastructure/security/audit-logger.ts
export interface AuditLog {
  timestamp: Date
  userId?: string
  action: string
  resource: string
  resourceId?: string
  result: 'success' | 'failure'
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export class AuditLogger {
  constructor(private readonly prisma: PrismaClient) {}
  
  async log(entry: AuditLog): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        ...entry,
        timestamp: entry.timestamp || new Date()
      }
    })
  }
  
  // 重要な操作を自動的に記録
  @AuditLog('ingredient.delete')
  async deleteIngredient(
    ingredientId: string,
    userId: string,
    context: RequestContext
  ): Promise<void> {
    // 削除処理
  }
}

// 監査ログデコレーター
export function AuditLog(action: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const auditLogger = new AuditLogger(prisma)
      const context = args[args.length - 1] as RequestContext
      
      try {
        const result = await originalMethod.apply(this, args)
        
        await auditLogger.log({
          timestamp: new Date(),
          userId: context.user?.id,
          action,
          resource: target.constructor.name,
          resourceId: args[0], // 通常は最初の引数がリソースID
          result: 'success',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        })
        
        return result
      } catch (error) {
        await auditLogger.log({
          timestamp: new Date(),
          userId: context.user?.id,
          action,
          resource: target.constructor.name,
          resourceId: args[0],
          result: 'failure',
          metadata: { error: error.message },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        })
        
        throw error
      }
    }
  }
}
```

## 関連ドキュメント

- [監視・ログ設計](./MONITORING_LOGGING.md)
- [パフォーマンス最適化](./PERFORMANCE_OPTIMIZATION.md)
- [デプロイメント戦略](./DEPLOYMENT.md)