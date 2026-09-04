/**
 * @marketplace/config-eslint — shared base config.
 * Apps extend this with their own framework-specific rules.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  ignorePatterns: ['node_modules', 'dist', '.next', 'coverage'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};