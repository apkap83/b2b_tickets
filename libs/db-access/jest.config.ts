/* eslint-disable */
export default {
  displayName: 'db-access',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/db-access',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // testTimeout: 30000, // Extended timeout for database operations - moved to individual tests
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.spec.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/test/**',
  ],
};