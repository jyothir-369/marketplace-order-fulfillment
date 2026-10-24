import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
      ".turbo/**",
    ],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': hooksPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
  },
];
