/**
 * 買い物セッション中断コマンド
 * 買い物セッションを中断するために必要な情報を保持する
 */
export class AbandonShoppingSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string
  ) {}
}
