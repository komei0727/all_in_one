import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    exclude: ['node_modules/**', '.worktree/**'],
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
      ],
    },
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
