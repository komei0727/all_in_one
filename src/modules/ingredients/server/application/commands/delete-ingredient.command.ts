/**
 * 食材削除コマンド
 */
export class DeleteIngredientCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string
  ) {}
}
