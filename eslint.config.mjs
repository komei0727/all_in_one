// eslint.config.mjs
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import importPlugin from 'eslint-plugin-import'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  // 無視するファイル
  {
    ignores: [
      '.next/**',
      'dist/**',
      'out/**',
      'coverage/**',
      '*.d.ts',
      '*.config.js',
      '*.config.mjs',
      '.worktree/**',
      'node_modules/**',
      '.turbo/**',
      '.vercel/**',
      'src/generated/**',
    ],
  },

  // 基本設定
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // ESLint推奨設定
  eslint.configs.recommended,

  // TypeScript設定（パフォーマンス最適化版）
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.recommended,
      // 型チェックが必要な重要なルールのみ選択的に追加
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 基本的なTypeScriptルール
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'inline-type-imports',
        },
      ],

      // 型安全性ルール（より現実的な設定）
      '@typescript-eslint/no-unsafe-assignment': 'warn', // 段階的に対応
      '@typescript-eslint/no-unsafe-call': 'warn', // 段階的に対応
      '@typescript-eslint/no-unsafe-member-access': 'off', // 将来的に有効化
      '@typescript-eslint/no-unsafe-return': 'off', // 将来的に有効化
      '@typescript-eslint/no-unsafe-argument': 'off', // 将来的に有効化
    },
  },

  // Next.js設定
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off', // App Routerでは不要
    },
  },

  // Import順序設定（簡素化版）
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'type'],
          pathGroups: [
            {
              pattern: '{react,react/**}',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '{next,next/**}',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },

  // 共通ルール
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // テストファイル用設定
  {
    files: [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      'tests/**/*',
      '**/__tests__/**/*',
      '**/__fixtures__/**/*',
    ],
    rules: {
      // テストでは any 型を許可（モックやテストダブルで必要な場合があるため）
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      // テストファイルでは型安全性ルールを無効化
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  // 設定ファイル用
  {
    files: ['*.config.{ts,mts}', 'vitest.config.*.ts'],
    rules: {
      'import/order': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Prettier統合（最後に適用）
  prettierConfig
)
