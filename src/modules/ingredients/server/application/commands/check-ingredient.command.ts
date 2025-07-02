/**
 * 食材確認コマンド
 * 買い物セッション中に食材をチェックする
 */
export class CheckIngredientCommand {
  constructor(
    public readonly sessionId: string,
    public readonly ingredientId: string,
    public readonly userId: string
  ) {}
}
