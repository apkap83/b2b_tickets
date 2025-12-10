const { Config } = require('jest');

const config: Config = {
  displayName: 'admin-server-actions',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // Nx automatically handles moduleNameMapper based on tsconfig.base.json paths
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test-setup.ts',
    '!src/__tests__/**',
  ],
};

module.exports = config;
