import js from '@eslint/js';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/static/**',
      '**/coverage/',
      '**/*.d.ts',
      '**/__tests__/',
      '**/lib/',
      'package.json',
      '**/docs/build/**',
      '**/build/**',
      '**/_build/**',
      '**/jest.setup.js',
      '**/jest.config.js',
      '**/babel.config.js',
      '**/webpack.config.js',
      '**/build-with-fake-jlpm.js'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React
  {
    ...react.configs.flat.recommended,
    plugins: { react },
    settings: {
      react: { version: 'detect' }
    }
  },

  // Prettier (turn off conflicting rules + run prettier)
  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'error'
    }
  },

  // TS rules + typed linting
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: true }
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
      '@typescript-eslint/no-use-before-define': 'off',
      quotes: [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: false }
      ],
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'prefer-arrow-callback': 'error'
    }
  }
];
