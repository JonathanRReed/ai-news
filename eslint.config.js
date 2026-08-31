import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactCompilerPlugin from 'eslint-plugin-react-compiler';
import astroPlugin from 'eslint-plugin-astro';
import * as astroParser from 'astro-eslint-parser';

export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      'node_modules/',
      '.astro/',
      'dist/',
      'build/',
      'out/',
      '.cache/',
      '.wrangler/',
      'coverage/',
      '.vercel/',
      '.netlify/',
      'public/build/'
    ]
  },

  // Base config for all files
  eslint.configs.recommended,

  // TypeScript and React files
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        RequestInfo: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDialogElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLDivElement: 'readonly',
        CustomEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Node globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // Common React-in-Vite/Astro rule
      'react/react-in-jsx-scope': 'off',
      // Allow unused vars/args when prefixed with underscore
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_' 
      }],
      // Relax React hooks rules for modern patterns and allow manual memoization
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'off'
    }
  },

  // React Compiler analysis is meaningful only for React components. Applying
  // it to Node ingestion scripts makes the repository-wide lint gate stall.
  {
    files: ['src/**/*.{jsx,tsx}'],
    plugins: {
      'react-compiler': reactCompilerPlugin
    },
    rules: {
      'react-compiler/react-compiler': 'warn'
    }
  },

  // Astro files
  {
    files: ['**/*.astro'],
    plugins: {
      'astro': astroPlugin
    },
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsparser,
        extraFileExtensions: ['.astro']
      },
      globals: {
        // Browser globals for Astro
        window: 'readonly',
        document: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      ...astroPlugin.configs.recommended.rules,
      // Disable React-specific rules for Astro templates
      'react/no-unknown-property': 'off',
      'react/jsx-key': 'off',
      // Variables in frontmatter are often used in JSX expressions
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
];
