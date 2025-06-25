export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            メールを確認してください
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ログインリンクをメールで送信しました。
          </p>
          <p className="mt-4 text-sm text-gray-600">
            メール内のリンクをクリックしてログインしてください。
          </p>
        </div>
      </div>
    </div>
  )
}