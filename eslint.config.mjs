import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const javascriptFiles = ['**/*.{js,mjs,cjs}'];
const typescriptFiles = ['**/*.{ts,tsx,mts,cts}'];
const frontendFiles = ['src/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'];

export default [
  {
    ignores: [
      '**/node_modules/**',
      'dist/**',
      'coverage/**',
      'server/dist/**',
      'playwright-report/**',
      'test-results/**',
      '.claude/tmp/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: javascriptFiles,
  },
  ...tsPlugin.configs['flat/recommended'].map(config => ({
    ...config,
    files: typescriptFiles,
  })),
  {
    files: javascriptFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: typescriptFiles,
    languageOptions: {
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ...reactHooks.configs.flat['recommended-latest'],
    files: frontendFiles,
  },
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['src/**/*.tsx'],
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },
  {
    ...reactRefresh.configs.vite,
    files: ['src/**/*.tsx'],
  },
  prettierRecommended,
  {
    rules: {
      'prettier/prettier': 'warn',
    },
  },
];
