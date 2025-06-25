import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'integration',
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node', // 統合テストはNode環境で実行
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    globalSetup: './tests/setup/database.setup.ts',
    pool: 'forks', // プロセスを分離してDBの競合を防ぐ
    poolOptions: {
      forks: {
        singleFork: true, // 単一プロセスで順次実行
      },
    },
    testTimeout: 30000, // 統合テストは時間がかかる可能性がある
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@ingredients': path.resolve(__dirname, './src/modules/ingredients'),
      '@shared': path.resolve(__dirname, './src/modules/shared'),
      '@/generated': path.resolve(__dirname, './src/generated'),
    },
  },
})
