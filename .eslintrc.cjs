/* ESLint config for Astro + React + TypeScript + React Compiler rules */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  settings: {
    react: { version: 'detect' }
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-compiler',
    'astro'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:astro/recommended'
  ],
  rules: {
    // Enable React Compiler constraints as warnings (upgrade to 'error' once codebase is ready)
    'react-compiler/react-compiler': 'warn',
    // Common React-in-Vite/Astro rule
    'react/react-in-jsx-scope': 'off',
    // Allow unused vars/args when prefixed with underscore
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      files: ['**/*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro']
      },
      // Disable React-specific rules for Astro templates (they use HTML attrs like class, onerror, etc.)
      rules: {
        'react/no-unknown-property': 'off',
        'react/jsx-key': 'off'
      }
    }
  ]
};
