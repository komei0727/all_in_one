/**
 * 買い物セッション完了コマンド
 */
export class CompleteShoppingSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string
  ) {}
}
