// eslint.config.mjs
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import importPlugin from 'eslint-plugin-import'
import prettierConfig from 'eslint-config-prettier'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default tseslint.config(
  // 無視するファイル（最初に定義）
  {
    ignores: [
      // ビルド出力
      '.next/**',
      'dist/**',
      'out/**',
      'coverage/**',

      // 生成されたファイル
      'src/generated/**',
      '*.d.ts',

      // 設定ファイル（ただしTypeScriptのものは除く）
      '*.config.js',
      '*.config.mjs',

      // その他
      '.worktree/**',
      'node_modules/**',
      '.eslintrc.*',

      // キャッシュ
      '.turbo/**',
      '.vercel/**',
    ],
  },

  // ファイルごとの設定
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // ブラウザグローバル
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',

        // Node.jsグローバル
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // Next.jsグローバル
        React: 'readonly',
      },
    },
  },

  // JavaScript基本設定
  eslint.configs.recommended,

  // TypeScript設定（ファイルパターンを明示）
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript固有のルール
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
      '@typescript-eslint/no-duplicate-enum-values': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // 型安全性のルール（厳しすぎるものは警告に）
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',

      // スタイルルールの調整
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/class-literal-property-style': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // Next.jsプラグイン設定
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // import/orderルール設定
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
        node: true,
      },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'type'],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
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

  // 一般的なルール
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // 基本的なコード品質ルール
      'no-console': 'warn',
      'no-unused-vars': 'off', // TypeScriptのルールを使用
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'prefer-destructuring': [
        'error',
        {
          array: false,
          object: true,
        },
      ],

      // React固有のルール（Next.jsプラグインで大部分はカバーされている）
      'react/jsx-no-target-blank': 'off', // Next.jsがカバー
      'react/react-in-jsx-scope': 'off', // Next.jsでは不要
    },
  },

  // テストファイル用の設定
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}', 'tests/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // 設定ファイル用の緩い設定
  {
    files: ['*.config.{ts,mts}', 'vitest.config.*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'import/order': 'off',
    },
  },

  // Prettierとの統合（最後に適用して競合を回避）
  prettierConfig
)
