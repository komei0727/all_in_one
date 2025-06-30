import path from 'path'

import { defineConfig } from 'vitest/config'

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
    alias: [
      { find: '@/auth', replacement: path.resolve(__dirname, './tests/__mocks__/auth.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@/app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@/modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@/lib', replacement: path.resolve(__dirname, './src/lib') },
      { find: '@tests', replacement: path.resolve(__dirname, './tests') },
      { find: '@ingredients', replacement: path.resolve(__dirname, './src/modules/ingredients') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/modules/shared') },
      { find: '@/generated', replacement: path.resolve(__dirname, './src/generated') },
    ],
  },
})
