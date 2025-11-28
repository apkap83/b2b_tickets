import type { Config } from 'jest';

const config: Config = {
  displayName: 'server-actions',
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
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60, 
      functions: 70,
      lines: 70,
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