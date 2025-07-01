/**
 * 買い物場所値オブジェクト
 * 買い物を行っている場所の情報を表現する
 */
export class ShoppingLocation {
  private readonly name: string | null
  private readonly latitude: number
  private readonly longitude: number

  private constructor(params: { latitude: number; longitude: number; name?: string | null }) {
    // バリデーション実行
    this.validateLatitude(params.latitude)
    this.validateLongitude(params.longitude)
    if (params.name !== undefined && params.name !== null) {
      this.validateName(params.name)
    }

    this.latitude = params.latitude
    this.longitude = params.longitude
    this.name = params.name && params.name.trim() !== '' ? params.name : null
  }

  /**
   * ShoppingLocationを作成する
   * @param params 作成パラメータ
   * @returns ShoppingLocation
   */
  static create(params: {
    latitude: number
    longitude: number
    name?: string | null
  }): ShoppingLocation {
    return new ShoppingLocation(params)
  }

  /**
   * 場所の名前を取得する
   * @returns 場所の名前（設定されていない場合はnull）
   */
  getName(): string | null {
    return this.name
  }

  /**
   * 緯度を取得する
   * @returns 緯度
   */
  getLatitude(): number {
    return this.latitude
  }

  /**
   * 経度を取得する
   * @returns 経度
   */
  getLongitude(): number {
    return this.longitude
  }

  /**
   * GPS座標を取得する
   * @returns 緯度経度オブジェクト
   */
  getCoordinates(): { latitude: number; longitude: number } {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
    }
  }

  /**
   * 他の場所との距離を計算する（km）
   * @param other 比較対象の場所
   * @returns 距離（km）
   */
  getDistanceTo(other: ShoppingLocation): number {
    const R = 6371 // 地球の半径（km）
    const dLat = this.toRad(other.latitude - this.latitude)
    const dLon = this.toRad(other.longitude - this.longitude)
    const lat1 = this.toRad(this.latitude)
    const lat2 = this.toRad(other.latitude)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * 等価性を判定する
   * @param other 比較対象
   * @returns 同じ場所の場合true
   */
  equals(other: ShoppingLocation): boolean {
    return (
      this.latitude === other.latitude &&
      this.longitude === other.longitude &&
      this.name === other.name
    )
  }

  /**
   * 文字列表現を取得する
   * @returns 文字列表現
   */
  toString(): string {
    if (this.name) {
      return `${this.name} (${this.latitude}, ${this.longitude})`
    }
    return `(${this.latitude}, ${this.longitude})`
  }

  /**
   * 緯度のバリデーション
   */
  private validateLatitude(latitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new Error(`緯度は-90から90の範囲で指定してください: ${latitude}`)
    }
  }

  /**
   * 経度のバリデーション
   */
  private validateLongitude(longitude: number): void {
    if (longitude < -180 || longitude > 180) {
      throw new Error(`経度は-180から180の範囲で指定してください: ${longitude}`)
    }
  }

  /**
   * 名前のバリデーション
   */
  private validateName(name: string): void {
    if (name.length > 100) {
      throw new Error('場所の名前は100文字以内で指定してください')
    }
  }

  /**
   * 度からラジアンに変換
   */
  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }
}
