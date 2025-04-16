// Use this file to export React server components
export * from './lib/totp-service';

export {
  sendOTP,
  generateAndRedisStoreNewOTPForUser,
  validateOTPCodeForUserThroughRedis,
  maxOTPAttemptsReached,
} from './lib/totp-service';
