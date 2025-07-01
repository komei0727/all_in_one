/**
 * 買い物セッション開始コマンド
 */
export class StartShoppingSessionCommand {
  constructor(public readonly userId: string) {}
}
