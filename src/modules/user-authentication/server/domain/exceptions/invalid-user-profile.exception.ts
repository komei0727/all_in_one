import { ValidationException } from '@/modules/shared/server/domain/exceptions'

/**
 * ユーザープロフィールが無効な場合の例外
 */
export class InvalidUserProfileException extends ValidationException {
  constructor(field: string, message: string, value?: unknown) {
    super(message, field, value)
  }
}

/**
 * 表示名が無効な場合の例外
 */
export class InvalidDisplayNameException extends InvalidUserProfileException {
  constructor(displayName: string, reason: string) {
    super('displayName', reason, displayName)
  }
}

/**
 * タイムゾーンが無効な場合の例外
 */
export class InvalidTimezoneException extends InvalidUserProfileException {
  constructor(timezone: string) {
    super('timezone', '無効なタイムゾーンです', timezone)
  }
}

/**
 * 言語が無効な場合の例外
 */
export class InvalidLanguageException extends InvalidUserProfileException {
  constructor(language: string) {
    super('language', 'サポートされていない言語です', language)
  }
}
