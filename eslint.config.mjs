import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'examples/assets/**', 'examples/**/*.jsx']
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }]
    }
  },
  {
    files: ['src/**/*.js', 'react/**/*.js', 'tests/**/*.js', 'examples/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 }
    }
  },
  {
    files: ['scripts/**/*.mjs', 'vitest.config.mjs', 'eslint.config.mjs'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },
  {
    files: ['react/**/*.js'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules }
  }
];
