import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['tests/e2e/**/*.test.ts'],
    environment: 'node', // E2EテストはNode環境で実行
    globals: true,
    setupFiles: ['./tests/setup/database.setup.ts'],
    globalSetup: ['./tests/setup/database.setup.ts'],
    pool: 'forks', // プロセスを分離してDBの競合を防ぐ
    poolOptions: {
      forks: {
        singleFork: true, // 単一プロセスで順次実行
      },
    },
    testTimeout: 60000, // E2Eテストは時間がかかる
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
    },
  },
})
