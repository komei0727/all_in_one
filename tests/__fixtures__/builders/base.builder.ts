/**
 * テストデータビルダーの基底クラス
 * 全てのビルダーはこのクラスを継承する
 * @template TProps - ビルダー内で使用されるプロパティの型
 * @template TResult - build()メソッドが返すオブジェクトの型
 */
export abstract class BaseBuilder<TProps, TResult = TProps> {
  protected props: Partial<TProps> = {}

  /**
   * 現在のプロパティ値を取得
   */
  getProps(): Partial<TProps> {
    return { ...this.props }
  }

  /**
   * プロパティを設定する
   */
  protected with<K extends keyof TProps>(key: K, value: TProps[K]): this {
    this.props[key] = value
    return this
  }

  /**
   * ビルド結果を返す
   */
  abstract build(): TResult

  /**
   * 複数のインスタンスをビルドする
   */
  buildMany(count: number): TResult[] {
    return Array.from({ length: count }, () => this.build())
  }
}
