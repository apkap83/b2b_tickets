/* eslint-disable */
export default {
  displayName: 'b2b_tickets',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/next/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/b2b_tickets',
  setupFilesAfterEnv: ['<rootDir>/specs/setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/specs/CookieConsentBanner.spec.tsx',
    '<rootDir>/specs/simplified-cookie-banner.spec.tsx'
  ],
};