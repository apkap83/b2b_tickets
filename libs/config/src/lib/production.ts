const os = require('os');

const isDevelopment =
  os.hostname() === 'MacBook-Pro-Apostolos.local' ||
  os.hostname() === 'ipintegrator1';

export const productionConfig = {
  webSiteUrl: process.env['WEBSITE_URL'] as string,

  emailListOfHandlers: [process.env['EMAIL_LIST_OF_HANDLERS'] as string],

  attachmentsPrefixPath: 'N/A For Production/Staging',

  attachmentsMaxFileSize: 20 * 1024 * 1024, // 20MB

  SMSGateway: 'smpp://sms-gw1:5030',
  SMS_SystemId: 'B2BTicketing',
  SMS_Password: process.env['SMS_PASSWORD'] as string,
  SMS_System_Type: 'B2BGW',

  logDirPerEnvironment: 'production',
  SendEmails: true,
  TimeZone: 'Europe/Athens',

  redisHost: 'redis_host',
  redisPort: 6379,

  postgres_b2b_database: {
    host: isDevelopment ? '127.0.0.1' : 'b2b_database',
    port: isDevelopment ? 5432 : 9002,
    db: 'postgres',
    username: 'postgres',
    schemaName: 'b2btickets',
    debugMode: false,
    minConnections: 12,
    maxConnections: 14,
    sequelizeMinConnections: 5,
    sequelizeMaxConnections: 8,
    applicationName: 'B2B Tickets Production',
    applicationNameSequelize: 'B2B Tickets Production (Sequelize)',
    acquire: 45000,
    idleTimeout: 10000,
    connectionTimeout: 45000,
  },
  api: {
    process: 'b2btickets_production',
    user: 'ProductionApiUser',
  },
  logging: {
    applicationLoggingLevel: 'info',
  },
  TICKET_ITEMS_PER_PAGE: 20,
  CaptchaIsActive: true,
  CaptchaIsActiveForPasswordReset: true,
  CaptchaV3Threshold: 0.3,
  TwoFactorEnabled: true,
  TwoFactorEnabledForPasswordReset: true,
  TwoFactorDigitsLength: 5,
  TwoFactorValiditySeconds: 270,
  ShowCookieConsentBanner: true,
  SessionMaxAge: 60 * 60, // Session max age to 60 minutes (in seconds)
  SessionUpdateAge: 30, // Session is refreshed every 30 seconds

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
