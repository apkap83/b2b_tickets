/* eslint-disable */
export default {
  setupFilesAfterEnv: ['<rootDir>/tests/test-setup.ts'], // Add your setup file path
  displayName: 'tickets',
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/libs/tickets',
  testMatch: [
    '**/?(*.)+(spec|test).[jt]s?(x)', // This pattern will match .spec.ts, .spec.tsx, .test.ts, .test.tsx files
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'], // Ensure Jest recognizes TypeScript and JSX files

  // If using Babel or ts-jest for TypeScript, make sure to include this:
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // For handling TypeScript/TSX files
  },
};
