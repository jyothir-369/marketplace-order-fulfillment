const base = require('./index');

module.exports = [
  ...base,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];