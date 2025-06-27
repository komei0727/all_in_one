import { createId } from '@paralleldrive/cuid2'

import { PrefixedCuidId } from './prefixed-cuid-id.base'
import { ID_PREFIXES } from '../constants/id-prefixes'

/**
 * ユーザーID値オブジェクト
 * ユーザーの一意識別子を表現する
 *
 * 共有カーネルの一部として、すべてのコンテキストから利用可能
 * - 食材管理コンテキスト: 食材の所有者識別
 * - ユーザー認証コンテキスト: ユーザー集約のID
 * - 買い物サポートコンテキスト: 買い物リストの所有者識別
 *
 * プレフィックス付きCUID形式の識別子を表現する
 */
export class UserId extends PrefixedCuidId {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return 'ユーザーID'
  }

  /**
   * IDのプレフィックスを取得
   * @returns プレフィックス
   */
  protected getPrefix(): string {
    return ID_PREFIXES.user
  }

  /**
   * 新しいユーザーIDを生成
   * @returns 新しいユーザーID
   */
  static generate(): UserId {
    return new UserId(ID_PREFIXES.user + createId())
  }
}
