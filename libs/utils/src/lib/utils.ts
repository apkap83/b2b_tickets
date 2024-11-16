import { authenticator } from 'otplib';
import { config } from '@b2b-tickets/config';
import {
  TicketStatusColors,
  TicketSeverityLevels,
  TicketSeverityColors,
  AppPermissionTypes,
  AppRoleTypes,
  AppPermissionType,
  B2BUserType,
} from '@b2b-tickets/shared-models';
import { Session } from 'next-auth';
import * as crypto from 'crypto';
import * as Yup from 'yup';

import { B2BUser } from '@b2b-tickets/db-access';

import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

const ALGORITHM = 'aes-256-cbc';
const INPUT_ENCODING = 'utf8';
const OUTPUT_ENCODING = 'hex';
const IV_LENGTH = 16; // AES blocksize

// Set the length to 4 digits and 120 seconds
authenticator.options = {
  digits: config.TwoFactorDigitsLength,
  step: config.TwoFactorValiditySeconds,
};

export const userHasPermission = (
  session: Session | null,
  permissionName: AppPermissionTypes | AppPermissionTypes[]
): boolean => {
  if (!session || !session.user) return false; // Return false if session or user is missing

  // Normalize permissionName to an array for consistent handling
  const permissionsToCheck = Array.isArray(permissionName)
    ? permissionName
    : [permissionName];

  return session.user.permissions.some(
    (permission: AppPermissionType) =>
      permissionsToCheck.includes(permission.permissionName) ||
      permission.permissionName === AppPermissionTypes.API_Admin
  );
};

export const endPointPermitted = (session: any, endpoint: any) => {
  if (session?.user?.roles.includes(AppRoleTypes.Admin)) return true;

  return session?.user?.permissions.some((perm: any) =>
    perm.permissionEndPoint?.startsWith(endpoint)
  );
};

export const userHasRole = (
  session: Session | null,
  roleName: AppRoleTypes | AppRoleTypes[]
) => {
  if (!session) return false;

  // Normalize roleName to an array for consistent handling
  const rolesToCheck = Array.isArray(roleName) ? roleName : [roleName];

  return session?.user?.roles.some(
    (role: AppRoleTypes) =>
      rolesToCheck.includes(role) || role === AppRoleTypes.Admin
  );
};

export function formatDate(date: Date | null) {
  if (!date) return null;
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      // second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

// utils.ts
export const getEnvVariable = (variableName: string): string => {
  const value = process.env[variableName];
  if (!value) {
    throw new Error(`${variableName} environment variable is not set.`);
  }
  return value;
};

export const getGreekDateFormat = (dateObj: Date) => {
  // Format the date as DD/MM/YYYY
  const formattedDate = dateObj.toLocaleDateString('el-GR');

  // Format the time as HH:MM AM/PM in Greek (πμ for AM and μμ for PM)
  const formattedTime = dateObj.toLocaleTimeString('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit', // Include seconds
    hour12: true, // This ensures AM/PM format (πμ/μμ in Greek)
  });
  return `${formattedDate} ${formattedTime}`;
};

export const convertToISODate = (dateStr: string) => {
  // Replace Greek AM/PM with standard AM/PM
  let standardizedDateStr = dateStr.replace('πμ', 'AM').replace('μμ', 'PM');

  // Swap day and month
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2} [AP]M)/;
  const match = standardizedDateStr.match(dateRegex);

  if (match) {
    const [, day, month, year, time] = match;
    standardizedDateStr = `${month}/${day}/${year} ${time}`;
  }

  // Parse the standardized date string to a JavaScript Date object
  const parsedDate = new Date(standardizedDateStr);

  // Convert the Date object to an ISO string
  return parsedDate.toISOString();
};

export const convertTo24HourFormat = (dateStr: string): string | null => {
  // Replace Greek AM/PM with standard AM/PM
  let standardizedDateStr = dateStr.replace('πμ', 'AM').replace('μμ', 'PM');

  // Parse the date string using a regex
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) (AM|PM)/;
  const match = standardizedDateStr.match(dateRegex);

  if (!match) return null;

  let [, day, month, year, hour, minute, period] = match;

  // Convert hour to 24-hour format
  let hourNumber = parseInt(hour);
  if (period === 'PM' && hourNumber < 12) {
    hourNumber += 12;
  } else if (period === 'AM' && hourNumber === 12) {
    hourNumber = 0;
  }

  // Format the date string to YYYY-MM-DD HH:mm:ss
  const formattedDate = `${year}-${month}-${day} ${String(hourNumber).padStart(
    2,
    '0'
  )}:${minute}:00`;

  return formattedDate;
};

/**
 *
 * @param text Value to be encrypted
 * @param key Key used to encrypt value must be 32 bytes for AES256 encryption algorithm
 *
 * @returns Encrypted value using key
 */
export const symmetricEncrypt = function (text: string): string {
  const _key = Buffer.from(process.env['ENCRYPTION_KEY']!, 'hex');

  // Validate inputs
  if (!_key || _key.length !== 32) {
    throw new Error('Invalid encryption key length. Must be 32 bytes.');
  }

  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text. Must be a non-empty string.');
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, _key, iv);

    let ciphered = cipher.update(text, INPUT_ENCODING, OUTPUT_ENCODING);
    ciphered += cipher.final(OUTPUT_ENCODING);

    const ciphertext = `${iv.toString(OUTPUT_ENCODING)}:${ciphered}`;
    return ciphertext;
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 *
 * @param text Value to decrypt
 * @param key Key used to decrypt value must be 32 bytes for AES256 encryption algorithm
 */
export const symmetricDecrypt = function (text: string): string {
  const _key = Buffer.from(process.env['ENCRYPTION_KEY']!, 'hex');

  // Validate inputs
  if (_key.length !== 32) {
    throw new Error('Invalid encryption key length. Must be 32 bytes.');
  }
  console.log('text', text);
  if (!text.includes(':')) {
    throw new Error(
      'Invalid ciphertext format. Must contain IV and ciphertext.'
    );
  }

  try {
    const components = text.split(':');
    const iv_from_ciphertext = Buffer.from(
      components.shift() || '',
      OUTPUT_ENCODING
    );
    const ciphertext = components.join(':');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      _key,
      iv_from_ciphertext
    );

    let deciphered = decipher.update(
      ciphertext,
      OUTPUT_ENCODING,
      INPUT_ENCODING
    );
    deciphered += decipher.final(INPUT_ENCODING);

    return deciphered;
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

// Assuming the user's secret is stored and encrypted
export const generateOtpCode = (encryptedSecret: string) => {
  const secret = symmetricDecrypt(encryptedSecret);
  const otpCode = authenticator.generate(secret);
  return otpCode;
};

export const getStatusColor = (status_id: string) => {
  switch (status_id) {
    case '1':
      return TicketStatusColors.NEW;
    case '2':
      return TicketStatusColors.WORKING;
    case '3':
      return TicketStatusColors.CANCELLED;
    case '4':
      return TicketStatusColors.CLOSED;
    default:
      return '#000'; // Fallback color
  }
};

// export const getStatusColorDesc = (ticketStatus: string) => {
//   switch (ticketStatus) {
//     case TicketStatusName.NEW:
//       return TicketStatusColors.NEW;
//     case TicketStatusName.WORKING:
//       return TicketStatusColors.WORKING;
//     case TicketStatusName.CANCELLED:
//       return TicketStatusColors.CANCELLED;
//     case TicketStatusName.CLOSED:
//       return TicketStatusColors.CLOSED;
//     default:
//       return '#000'; // Fallback color
//   }
// };

// Format the time left into MM:SS format
export const formatTimeMMSS = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const getSeverityStatusColor = (severityId: string) => {
  switch (severityId) {
    case TicketSeverityLevels.Low:
      return TicketSeverityColors.Low;
    case TicketSeverityLevels.Medium:
      return TicketSeverityColors.Medium;
    case TicketSeverityLevels.High:
      return TicketSeverityColors.High;
    default:
      return '#000'; // Fallback color
  }
};

export function generateResetToken() {
  const buffer = crypto.randomBytes(18); // generates 18 random bytes
  return buffer.toString('base64').replace(/[/+=]/g, '').substring(0, 25); // convert to base64, remove non-alphanumeric characters, and trim to 25 chars
}

export const passwordComplexitySchema = Yup.string()
  .min(
    config.MinimumPasswordCharacters,
    `Password must be at least ${config.MinimumPasswordCharacters} characters long`
  )
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/\d/, 'Password must contain at least one number')
  .matches(
    /[!@#$%^&*(),.?":{}|<>]/,
    'Password must contain at least one special character'
  )
  .required('Password is required');

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
