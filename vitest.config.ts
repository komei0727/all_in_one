import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/vitest.setup.ts', './tests/setup/global-mocks.ts'],
    exclude: ['node_modules/**', '.worktree/**', 'tests/integration/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '.next/',
        'coverage/',
        '.worktree/',
        'prisma/seed.ts',
        'src/lib/prisma/**',
        'src/modules/shared/client/utils/**',
        'src/modules/shared/server/database/**',
        'src/generated/**',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@/auth', replacement: resolve(__dirname, './tests/__mocks__/auth.ts') },
      { find: '@', replacement: resolve(__dirname, './src') },
      { find: '@/app', replacement: resolve(__dirname, './src/app') },
      { find: '@/modules', replacement: resolve(__dirname, './src/modules') },
      { find: '@/lib', replacement: resolve(__dirname, './src/lib') },
      { find: '@/tests', replacement: resolve(__dirname, './tests') },
      { find: '@ingredients', replacement: resolve(__dirname, './src/modules/ingredients') },
      { find: '@shared', replacement: resolve(__dirname, './src/modules/shared') },
    ],
  },
})
