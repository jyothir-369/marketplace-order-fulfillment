module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: require('path').resolve(__dirname, 'babel.jest.config.cjs') }],
  },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: [
    '**/__tests__/**/*.spec.[tj]s?(x)',
    '**/test/**/*.spec.[tj]s?(x)',
  ],
};



