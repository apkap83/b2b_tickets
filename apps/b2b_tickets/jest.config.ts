/* eslint-disable */
module.exports = {
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
    '<rootDir>/specs/simplified-cookie-banner.spec.tsx',
    // Temporarily ignore API tests with complex dependencies during full suite runs
    '<rootDir>/specs/api/auth/captcha.test.ts',
    '<rootDir>/specs/api/auth/totp.test.ts',
    '<rootDir>/specs/api/auth/token.test.ts',
    '<rootDir>/specs/api/auth/clear.test.ts',
    '<rootDir>/specs/api/download-attachment.test.ts',
    '<rootDir>/specs/api/user/resetPassToken.test.ts',
    '<rootDir>/specs/api/api-test-setup.ts',
  ],
};
