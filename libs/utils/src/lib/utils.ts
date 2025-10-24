import { Session } from '@b2b-tickets/shared-models';
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
  TicketDetail,
  TicketDetailForTicketCreator,
  AllowedColumnsForFilteringType,
  AuthenticationTypes,
  CredentialsType,
} from '@b2b-tickets/shared-models';

import * as crypto from 'crypto';
import * as Yup from 'yup';

import { Socket } from 'socket.io-client';
import { WebSocketMessage, WebSocketData } from '@b2b-tickets/shared-models'; // Import WebSocketMessage and WebSocketData types
import { escape, trim } from 'validator';
import axios from 'axios';

const ALGORITHM = 'aes-256-cbc';
const INPUT_ENCODING = 'utf8';
const OUTPUT_ENCODING = 'hex';
const IV_LENGTH = 16; // AES blocksize

const proxyUrl = process.env['https_proxy'] || process.env['http_proxy'];

// Set the length to 4 digits and 120 seconds
authenticator.options = {
  digits: config.TwoFactorDigitsLength,
  step: config.TwoFactorValiditySeconds,
};

export const userHasPermission = (
  session: Session | null,
  permissionName: AppPermissionTypes | AppPermissionTypes[]
): boolean => {
  if (!session || !session.user) return false;

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
  if (!session || !session.user) return false;

  // If Role is Admin All Permissions Are Allowed
  if (session?.user?.roles.includes(AppRoleTypes.Admin)) return true;

  return session?.user?.permissions.some((perm: any) =>
    perm.permissionEndPoint?.startsWith(endpoint)
  );
};

export const userHasRole = (
  session: Session | null,
  roleName: AppRoleTypes | AppRoleTypes[]
) => {
  if (!session || !session.user) return false;

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
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      // second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

export const getGreekDateFormat = (dateObj: Date) => {
  // Format the date as DD/MM/YYYY
  const formattedDate = dateObj.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Format the time as HH:MM AM/PM in Greek (πμ for AM and μμ for PM)
  const formattedTime = dateObj.toLocaleTimeString('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    // second: '2-digit', // Include seconds
    hour12: true, // This ensures AM/PM format (πμ/μμ in Greek)
  });
  return `${formattedDate} ${formattedTime}`;
};

// export const convertTo24HourFormat = (dateStr: string): string | null => {
//   // Replace Greek AM/PM with standard AM/PM
//   let standardizedDateStr = dateStr.replace('πμ', 'AM').replace('μμ', 'PM');

//   // Parse the date string using a regex
//   const dateRegex = /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) (AM|PM)/;
//   const match = standardizedDateStr.match(dateRegex);

//   if (!match) return null;

//   let [, day, month, year, hour, minute, period] = match;

//   // Convert hour to 24-hour format, ensure valid AM/PM logic
//   let hourNumber = parseInt(hour);

//   // Validate time range
//   if (hourNumber < 1 || hourNumber > 12) return null;

//   if (period === 'PM' && hourNumber < 12) {
//     hourNumber += 12;
//   } else if (period === 'AM' && hourNumber === 12) {
//     hourNumber = 0;
//   }

//   // Format the date string to YYYY-MM-DD HH:mm:ss
//   const formattedDate = `${year}-${month}-${day} ${String(hourNumber).padStart(
//     2,
//     '0'
//   )}:${minute}:00`;

//   return formattedDate;
// };

export const convertTo24HourFormat = (dateStr: string): string | null => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }

    // Format as PostgreSQL expects: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Date conversion error:', error);
    return null;
  }
};

/**
 * Converts a date string in format 'DD/MM/YYYY HH:MM' to a Date object
 * @param dateStr - Date string in format '24/10/2025 19:30'
 * @returns Date object
 */
export const parseCustomDate = (dateStr: string): Date => {
  // Split the string into date and time parts
  const parts = dateStr.trim().split(' ');

  if (parts.length !== 2) {
    throw new Error(
      `Invalid date format: ${dateStr}. Expected format: 'DD/MM/YYYY HH:MM'`
    );
  }

  const [datePart, timePart] = parts;

  // Parse date components
  const dateComponents = datePart.split('/').map(Number);
  if (dateComponents.length !== 3) {
    throw new Error(
      `Invalid date part: ${datePart}. Expected format: 'DD/MM/YYYY'`
    );
  }
  const [day, month, year] = dateComponents;

  // Parse time components
  const timeComponents = timePart.split(':').map(Number);
  if (timeComponents.length !== 2) {
    throw new Error(`Invalid time part: ${timePart}. Expected format: 'HH:MM'`);
  }
  const [hours, minutes] = timeComponents;

  // Validate components
  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    isNaN(hours) ||
    isNaN(minutes)
  ) {
    throw new Error(`Invalid date/time values in: ${dateStr}`);
  }

  // Create and return the Date object
  // Note: month is 0-indexed in JavaScript Date
  return new Date(year, month - 1, day, hours, minutes);
};

/**
 *
 * @param text Value to be encrypted
 *
 * @returns Encrypted value using key
 */
export const symmetricEncrypt = function (text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text. Must be a non-empty string.');
  }

  const _key = Buffer.from(process.env['ENCRYPTION_KEY']!, 'hex');

  // Validate inputs
  if (!_key || _key.length !== 32) {
    throw new Error('Invalid encryption key length. Must be 32 bytes.');
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
  const buffer = crypto.randomBytes(24);
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
  // Remove <script> and <style> tags and their content
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove all other HTML tags
  return html.replace(/<[^>]*>/g, '');
}

// Utility function to map TicketDetail to TicketDetailForTicketCreator
export const mapToTicketCreator = (ticket: TicketDetail) => {
  return {
    ticket_id: ticket.ticket_id,
    customer_id: ticket.customer_id,
    severity_id: ticket.severity_id,
    Ticket: ticket.Ticket,
    Title: ticket.Title,
    Description: ticket.Description,
    Severity: ticket.Severity,
    category_service_type_id: ticket.category_service_type_id,
    Category: ticket.Category,
    Service: ticket.Service,
    Equipment: ticket.Equipment,
    Sid: ticket.Sid,
    Cid: ticket.Cid,
    Username: ticket.Username,
    Cli: ticket.Cli,
    'Contact person': ticket['Contact person'],
    'Contact phone number': ticket['Contact phone number'],
    'Occurence date': ticket['Occurence date'],
    Opened: ticket.Opened,
    'Opened By': ticket['Opened By'],
    ticket_creator_email: ticket.ticket_creator_email,
    status_id: ticket.status_id,
    Status: ticket.Status,
    'Status Date': ticket['Status Date'],
    'Status User': ticket['Status User'],
    Closed: ticket.Closed,
    'Closed By': ticket['Closed By'],
    'Actual Resolution Timestamp': ticket['Actual Resolution Timestamp'],
    'Remedy Ticket': ticket['Remedy Ticket'],
    'Current Escalation Level': ticket['Current Escalation Level'],
    Escalated: ticket.Escalated,
    escalation_levels: ticket.escalation_levels,
    comments: ticket.comments,
    'Is Final Status': ticket['Is Final Status'],
  };
};

// Utility function to emit socket events
export const emitSocketEvent = <T extends WebSocketMessage>(
  socket: Socket | null,
  event: T,
  data: WebSocketData[T]
) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.error('Socket is not connected');
  }
};

export const allowedColumnsForFiltering = [
  AllowedColumnsForFilteringType.CUSTOMER,
  AllowedColumnsForFilteringType.CUST_TYPE,
  AllowedColumnsForFilteringType.TICKET_NUMBER,
  AllowedColumnsForFilteringType.TITLE,
  AllowedColumnsForFilteringType.OPENED_BY,
];

export const columnAllowedForFilter = (column: string) =>
  allowedColumnsForFiltering.includes(column as AllowedColumnsForFilteringType);

export const sanitizeInput = (value: any): string | null => {
  if (value === null || value === undefined) return null;

  // If the value is a number, convert it to a string
  let sanitizedValue =
    typeof value === 'number' ? value.toString() : String(value);

  // Trim whitespace
  sanitizedValue = sanitizedValue.trim();

  // Escape single quotes to prevent SQL injection
  sanitizedValue = sanitizedValue.replace(/'/g, "''");

  return sanitizedValue;
};
export function generateOtp(length: number): string {
  const digits = '0123456789';
  const array = new Uint8Array(length);
  crypto.randomFillSync(array);

  return Array.from(array)
    .map((x) => digits[x % 10])
    .join('');
}

export function isValidEmail(email: string) {
  const regex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

export function getWhereObj(
  credentials: CredentialsType,
  emailProvided: boolean
): {
  username?: string;
  email?: string;
  authentication_type: AuthenticationTypes;
} | null {
  if (!credentials || !credentials?.userName) {
    return null; // Return null if credentials are undefined
  }

  let whereObj: {
    username?: string;
    email?: string;
    authentication_type: AuthenticationTypes;
  } = {
    username: credentials.userName.toLowerCase(),
    authentication_type: AuthenticationTypes.LOCAL,
  };

  if (emailProvided) {
    whereObj = {
      email: credentials.userName.toLowerCase(),
      authentication_type: AuthenticationTypes.LOCAL,
    };
  }

  return whereObj;
}

export const validateReCaptchaV2 = async (token: string) => {
  // const proxyUrl = process.env['https_proxy'] || process.env['http_proxy'];
  const secretKey = process.env['RECAPTCHA_V2_SECRET_KEY'];

  if (!secretKey) {
    throw new Error('reCAPTCHA secret key is missing.');
  }

  const params = new URLSearchParams();
  params.append('secret', secretKey);
  params.append('response', token);

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params,
      {
        // proxy: proxyUrl
        //   ? {
        //       host: new URL(proxyUrl).hostname,
        //       port: parseInt(new URL(proxyUrl).port || '80', 10),
        //       protocol: new URL(proxyUrl).protocol.replace(':', ''),
        //     }
        //   : false,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.success;
  } catch (error) {
    throw error;
  }
};

export const validateReCaptchaV3 = async (token: string) => {
  // const proxyUrl = process.env['https_proxy'] || process.env['http_proxy'];
  const secretKey = process.env['RECAPTCHA_V3_SECRET_KEY'];

  if (!secretKey) {
    throw new Error('reCAPTCHA secret key is missing.');
  }

  const params = new URLSearchParams();
  params.append('secret', secretKey);
  params.append('response', token);

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params,
      {
        // proxy: proxyUrl
        //   ? {
        //       host: new URL(proxyUrl).hostname,
        //       port: parseInt(new URL(proxyUrl).port || '80', 10),
        //       protocol: new URL(proxyUrl).protocol.replace(':', ''),
        //     }
        //   : false,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to determine if file can be previewed
export const isPreviewableFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop();
  const previewableExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'svg',
    'pdf',
    'txt',
    'log',
    'csv',
    'md',
    'markdown', // Markdown
    // 'doc',
    // 'docx', // Word documents (limited preview)
    'xlsx',
    'jfif',
  ];
  return previewableExtensions.includes(ext || '');
};

// Helper function to safely encode filename for Content-Disposition header
export const encodeFilenameForHeader = (filename: string): string => {
  // Remove or replace problematic characters
  const sanitized = filename
    .replace(/[\x00-\x1f\x7f-\xff]/g, '') // Remove control characters and extended ASCII
    .replace(/["\\\r\n]/g, '') // Remove quotes, backslashes, and line breaks
    .trim();

  // If the filename contains non-ASCII characters, use RFC 5987 encoding
  if (/[^\x00-\x7F]/.test(filename)) {
    const encoded = encodeURIComponent(filename);
    return `filename*=UTF-8''${encoded}`;
  }

  // For ASCII-only filenames, use simple quoting
  return `filename="${sanitized}"`;
};

export const mimeTypes: { [key: string]: string } = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',

  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',

  // Archives
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',

  // Audio/Video
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',

  // Default
  default: 'application/octet-stream',
};

export const SAFE_PREVIEW_TYPES = new Set([
  // Image formats
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/svg+xml',

  // Document formats
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc (legacy)

  // Spreadsheet formats
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls (legacy)

  // Text formats
  'text/plain',
  'text/csv',
  'application/json',
  'text/xml',
  'text/html',
  'text/css',
  'application/javascript',
  'text/markdown',
  // 'application/x-cfb',
]);

// Fallback MIME type detection for when fileTypeFromBuffer fails
export const getFallbackMimeType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mimeMap: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',

    // Documents
    pdf: 'application/pdf',

    // Text files
    txt: 'text/plain',
    log: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'text/xml',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'text/plain',
    jsx: 'text/plain',
    tsx: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

// Helper to check if content looks like text
export const isTextContent = (buffer: Buffer): boolean => {
  // Check first 1024 bytes for text-like content
  const sample = buffer.slice(0, Math.min(1024, buffer.length));
  let textChars = 0;

  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Count printable ASCII and common whitespace
    if (
      (byte >= 32 && byte <= 126) ||
      byte === 9 ||
      byte === 10 ||
      byte === 13
    ) {
      textChars++;
    }
  }

  return sample.length > 0 && textChars / sample.length > 0.25; // 25% text characters
};
