const os = require('os');

const isMacDevelopment =
  os.hostname() === 'MacBook-Pro-Apostolos.local' ||
  os.hostname() === 'ipintegrator1' ||
  os.hostname() === 'macbookpro';

export const developmentConfig = {
  webSiteUrl: process.env['WEBSITE_URL'] as string,

  emailListOfHandlers: [process.env['EMAIL_LIST_OF_HANDLERS'] as string],

  attachmentsPrefixPath: isMacDevelopment
    ? '/Users/apostoloskapetanios/LocalProgramming/b2b_tickets/attachment_files_test'
    : '/home/centos/applications/b2b_tickets/attachment_files_test',

  attachmentsMaxFileSize: 20 * 1024 * 1024, // 20MB

  SMSGateway: 'smpp://test-sms-gw1:5000',
  SMS_SystemId: 'B2BTicketing',
  SMS_Password: process.env['SMS_PASSWORD'] as string,
  SMS_System_Type: 'B2BGW',

  logDirPerEnvironment: 'development',
  SendEmails: false,

  TimeZone: 'Europe/Athens',

  redisHost: '127.0.0.1',
  redisPort: 6379,

  postgres_b2b_database: {
    host: isMacDevelopment ? '172.27.52.177' : 'b2b_database',
    port: 9002,
    db: 'postgres',
    username: 'postgres',
    schemaName: 'b2btickets_dev',
    debugMode: false,
    minConnections: 3,
    maxConnections: 3,
    sequelizeMinConnections: 3,
    sequelizeMaxConnections: 3,
    applicationName: 'B2B Tickets Development',
    applicationNameSequelize: 'B2B Tickets Development (Sequelize)',
    acquire: 45000,
    idleTimeout: 10000,
    connectionTimeout: 45000,
  },
  api: {
    process: 'b2btickets_development',
    user: 'DevelopmentApiUser',
  },
  logging: {
    applicationLoggingLevel: 'info',
  },
  TICKET_ITEMS_PER_PAGE: 20,
  CaptchaIsActive: false,
  CaptchaIsActiveForPasswordReset: true,
  CaptchaV3Threshold: 0.1,
  TwoFactorEnabled: true,
  TwoFactorEnabledForPasswordReset: true,
  TwoFactorDigitsLength: 5,
  TwoFactorValiditySeconds: 270,
  ShowCookieConsentBanner: true,
  SessionMaxAge: 60 * 60, // Session max age to 60 minutes (in seconds)
  SessionUpdateAge: 60, // Session is refreshed every 60 seconds

  SessionExpirationPopupShownInSeconds: 60 * 5, // 5 min

  PasswordComplexityActive: true,
  MinimumPasswordCharacters: 8,

  EmailRelayServerIP: process.env['EMAIL_RELAY_SERVER_IP'] as string,
  EmailRelayServerTCPPort: '25',
  EmailFromAddress: process.env['EMAIL_FROM_ADDRESS'] as string,

  userCreationSecureLinkValidity: 172800, // 2 days

  cookieConsentValidityInDays: 365,

  maxOTPAttemps: 3,
  maxOTPAttemptsBanTimeInSec: 300,
  totpJWTTokenCookieValidityInSec: 300,

  maxTokenAttempts: 5,
  maxTokenAttemptsBanTimeInSec: 300,
  emailJWTTokenCookieValidityInSec: 300,

  databaseIDOfTicketingSystemCompany: -1,
};
