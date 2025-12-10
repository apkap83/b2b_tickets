const { Config } = require('jest');

const config: typeof Config = {
  displayName: 'auth-options',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.ts$': ['ts-jest', {}], // Ensure ts-jest is transforming .ts files
    '^.+\\.tsx$': ['ts-jest', {}], // Also ensure .tsx files are handled
  },

  transformIgnorePatterns: [
    '/node_modules/(?!your-esm-package|another-esm-package)', // Make sure Jest can process ESM modules
  ],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Point to the setup file

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
