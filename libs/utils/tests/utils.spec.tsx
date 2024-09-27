// utils.test.js

import { symmetricEncrypt, symmetricDecrypt, generateOtpCode } from './utils';
import { authenticator } from 'otplib';

describe('Encryption and OTP Generation', () => {
  const text = 'Hello World';
  const key = Buffer.from('a'.repeat(64), 'hex'); // Simulated 32-byte key in hex

  test('symmetricEncrypt should return an encrypted string', () => {
    const encryptedText = symmetricEncrypt(text, key.toString('hex'));
    expect(encryptedText).toBeDefined();
    expect(encryptedText).toContain(':'); // The format includes IV and cipher text separated by ':'
  });

  test('symmetricDecrypt should return the original text', () => {
    const encryptedText = symmetricEncrypt(text, key.toString('hex'));
    const decryptedText = symmetricDecrypt(encryptedText, key.toString('hex'));
    expect(decryptedText).toEqual(text);
  });

  test('generateOtpCode should return a valid OTP code', () => {
    const encryptedSecret = symmetricEncrypt(
      'my-secret-key',
      key.toString('hex')
    );
    const otp = generateOtpCode(encryptedSecret);
    expect(otp).toBeDefined();
    expect(otp).toMatch(/^\d{4}$/); // Assuming OTP is a 4-digit code
  });
});
