const { Config } = require('jest');

const config: Config = {
  displayName: 'totp-service',
  preset: '../../jest.preset.js',
  // // testMatch: ['<rootDir>/src/lib/__tests__/**/*.spec.ts'],
  // testMatch: [
  //   '**/?(*.)+(spec|test).[jt]s?(x)', // This pattern will match .spec.ts, .spec.tsx, .test.ts, .test.tsx files
  // ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {}], // Ensure ts-jest is transforming .ts files
    '^.+\\.tsx$': ['ts-jest', {}], // Also ensure .tsx files are handled
  },

  transformIgnorePatterns: [
    '/node_modules/(?!your-esm-package|another-esm-package)', // Make sure Jest can process ESM modules
  ],

  collectCoverage: true,
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

module.exports = config;
