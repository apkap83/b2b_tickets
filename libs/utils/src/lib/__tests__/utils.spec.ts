import dotenv from 'dotenv';
import {
  userHasPermission,
  symmetricEncrypt,
  symmetricDecrypt,
  generateOtpCode,
} from '../utils';

import {
  TicketStatusColors,
  TicketSeverityLevels,
  TicketSeverityColors,
  AppPermissionTypes,
  AppRoleTypes,
  AppPermissionType,
  B2BUserType,
  TicketDetail,
  TicketDetailForTicketCreator,
  AllowedColumnsForFilteringType,
  AuthenticationTypes,
  CredentialsType,
} from '@b2b-tickets/shared-models';
const crypto = require('crypto');

// Load the environment variables from the .env file
dotenv.config();

describe('userHasPermission', () => {
  it('should return false if session is null', () => {
    const result = userHasPermission(null, AppPermissionTypes.API_Admin);
    expect(result).toBe(false);
  });
});

describe('Encryption and OTP Generation', () => {
  // Mock the environment variable before all tests
  beforeAll(() => {
    process.env['ENCRYPTION_KEY'] = crypto.randomBytes(32).toString('hex'); // Mock the env variable
  });

  const text = 'Hello World';
  const key = Buffer.from('a'.repeat(64), 'hex'); // Simulated 32-byte key in hex

  test('symmetricEncrypt should return an encrypted string', () => {
    const encryptedText = symmetricEncrypt(text);
    expect(encryptedText).toBeDefined();
    expect(encryptedText).toContain(':'); // The format includes IV and cipher text separated by ':'
  });

  test('symmetricDecrypt should return the original text', () => {
    const encryptedText = symmetricEncrypt(text);
    const decryptedText = symmetricDecrypt(encryptedText);
    expect(decryptedText).toEqual(text);
  });

  test('generateOtpCode should return a valid OTP code', () => {
    const encryptedSecret = symmetricEncrypt('my-secret-key');
    const otp = generateOtpCode(encryptedSecret);
    expect(otp).toBeDefined();
    expect(otp).toMatch(/^\d{5}$/); // Assuming OTP is a 4-digit code
  });
});
