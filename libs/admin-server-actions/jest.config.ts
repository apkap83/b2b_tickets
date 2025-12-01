import type { Config } from 'jest';

const config: Config = {
  displayName: 'admin-server-actions',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.ts$': ['ts-jest', {}],
    '^.+\\.tsx$': ['ts-jest', {}],
  },
  testEnvironment: 'node', // Important for server actions
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!your-esm-package|another-esm-package)',
  ],
  moduleNameMapper: {
    '^@b2b-tickets/(.+)/server$': '<rootDir>/../../libs/$1/src/server.ts',
    '^@b2b-tickets/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0, 
      functions: 0,
      lines: 0,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test-setup.ts',
    '!src/__tests__/**',
  ],
};

export default config;