const base = require('./index');

module.exports = [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
    },
  },
];