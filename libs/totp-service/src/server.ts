// Use this file to export React server components

export {
  sendOTP,
  logFaultyOTPAttempt,
  clearFaultyOTPAttempts,
  logTokenOTPAttempt,
  generateAndRedisStoreNewOTPForUser,
  validateOTPCodeForUserThroughRedis,
  maxOTPAttemptsReached,
  removeOTPAttemptsKey,
  removeOTPKey,
  removeTokenKey,
} from './lib/totp-service';
