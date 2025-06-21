export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="rounded-lg bg-white p-8 text-center shadow-xl dark:bg-gray-800">
        <h1 className="mb-4 text-4xl font-bold text-gray-800 dark:text-gray-100">
          食材管理アプリケーション
        </h1>
        <p className="mb-6 text-lg text-gray-600 dark:text-gray-300">
          一人暮らしの方向けの食材管理ツール
        </p>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            在庫確認と賞味期限管理で食材の無駄を削減
          </p>
          <div className="flex justify-center gap-4">
            <div className="rounded-md bg-green-100 px-4 py-2 dark:bg-green-900">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                ✓ 開発環境セットアップ完了
              </p>
            </div>
            <div className="rounded-md bg-blue-100 px-4 py-2 dark:bg-blue-900">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                ✓ データベース接続確認済み
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
