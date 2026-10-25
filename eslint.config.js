import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
export default [{
  ignores: ['**/dist/**', '**/node_modules/**', '**/.local-*/**']
}, js.configs.recommended, {
  files: ['**/*.{js,mjs,jsx}'],
  plugins: {react},
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    },
    globals: {
      ...globals.browser,
      ...globals.node
    }
  },
  rules: {
    'react/jsx-uses-vars': 'error',
    'react/jsx-no-undef': 'error',
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }]
  }
}];
