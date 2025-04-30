import type { Config } from 'jest';

const config: Config = {
  displayName: 'utils',
  preset: '../../jest.preset.js',
  // // testMatch: ['<rootDir>/src/lib/__tests__/**/*.spec.ts'],
  // testMatch: [
  //   '**/?(*.)+(spec|test).[jt]s?(x)', // This pattern will match .spec.ts, .spec.tsx, .test.ts, .test.tsx files
  // ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ], // Ensure ts-jest is transforming .ts files
    '^.+\\.tsx$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ], // Also ensure .tsx files are handled
  },

  transformIgnorePatterns: [
    '/node_modules/(?!your-esm-package|another-esm-package)', // Make sure Jest can process ESM modules
  ],

  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};

export default config;
