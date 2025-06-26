import path from 'path'

import { defineConfig } from 'vitest/config'

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
    alias: [
      { find: '@/auth', replacement: path.resolve(__dirname, './tests/__mocks__/auth.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@/app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@/modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@/lib', replacement: path.resolve(__dirname, './src/lib') },
      { find: '@ingredients', replacement: path.resolve(__dirname, './src/modules/ingredients') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/modules/shared') },
    ],
  },
})
