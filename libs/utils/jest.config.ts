import type { Config } from 'jest';

const config: Config = {
  displayName: 'utils',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.ts$': ['ts-jest', {}], // Ensure ts-jest is transforming .ts files
    '^.+\\.tsx$': ['ts-jest', {}], // Also ensure .tsx files are handled
  },

  transformIgnorePatterns: [
    '/node_modules/(?!your-esm-package|another-esm-package)', // Make sure Jest can process ESM modules
  ],

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
