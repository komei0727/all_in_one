/**
 * デバイスタイプ値オブジェクト
 * 買い物セッションで使用されるデバイスの種別を表現する
 */
export class DeviceType {
  // 定数として定義
  static readonly MOBILE = new DeviceType('MOBILE')
  static readonly TABLET = new DeviceType('TABLET')
  static readonly DESKTOP = new DeviceType('DESKTOP')

  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  /**
   * 文字列からDeviceTypeを作成する
   * @param value デバイスタイプ文字列
   * @returns DeviceType
   * @throws Error 無効なデバイスタイプの場合
   */
  static fromString(value: string): DeviceType {
    switch (value) {
      case 'MOBILE':
        return DeviceType.MOBILE
      case 'TABLET':
        return DeviceType.TABLET
      case 'DESKTOP':
        return DeviceType.DESKTOP
      default:
        throw new Error(`無効なデバイスタイプです: ${value}`)
    }
  }

  /**
   * 値を取得する
   * @returns デバイスタイプ文字列
   */
  getValue(): string {
    return this.value
  }

  /**
   * モバイルかどうか判定する
   * @returns モバイルの場合true
   */
  isMobile(): boolean {
    return this.value === 'MOBILE'
  }

  /**
   * タブレットかどうか判定する
   * @returns タブレットの場合true
   */
  isTablet(): boolean {
    return this.value === 'TABLET'
  }

  /**
   * デスクトップかどうか判定する
   * @returns デスクトップの場合true
   */
  isDesktop(): boolean {
    return this.value === 'DESKTOP'
  }

  /**
   * 表示名を取得する
   * @returns 日本語表示名
   */
  getDisplayName(): string {
    switch (this.value) {
      case 'MOBILE':
        return 'スマートフォン'
      case 'TABLET':
        return 'タブレット'
      case 'DESKTOP':
        return 'デスクトップ'
      default:
        return this.value
    }
  }

  /**
   * すべてのデバイスタイプを取得する
   * @returns すべてのDeviceType配列
   */
  static getAllTypes(): DeviceType[] {
    return [DeviceType.MOBILE, DeviceType.TABLET, DeviceType.DESKTOP]
  }

  /**
   * 等価性を判定する
   * @param other 比較対象
   * @returns 同じデバイスタイプの場合true
   */
  equals(other: DeviceType): boolean {
    return this.value === other.value
  }
}
