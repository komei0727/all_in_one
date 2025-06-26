/**
 * 共有カーネル - 値オブジェクト
 * すべてのコンテキストから利用可能な値オブジェクトを定義
 */

// 基底クラス
export { ValueObject } from './value-object.base'
export { StringId } from './string-id.base'
export { UuidId } from './uuid-id.base'
export { CuidId } from './cuid-id.base'
export { PrefixedCuidId } from './prefixed-cuid-id.base'
export { Name } from './name.base'

// 具体的な値オブジェクト
export { UserId } from './user-id.vo'
export { Email } from './email.vo'

// 定数
export { ID_PREFIXES, type IdPrefix } from '../constants/id-prefixes'
