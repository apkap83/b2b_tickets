import type { Config } from 'jest';

const config: Config = {
  displayName: 'config',
  preset: '../../jest.preset.js',
  testMatch: ['<rootDir>/src/lib/__tests__/**/*.spec.ts'],
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
};

export default config;
