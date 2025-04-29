import { developmentConfig } from '../development';

describe('developmentConfig', () => {
  // Top-level properties
  it('should have a valid webSiteUrl property', () => {
    expect(developmentConfig).toHaveProperty('webSiteUrl');
  });

  it('should have a valid emailListOfHandlers property', () => {
    expect(developmentConfig).toHaveProperty('emailListOfHandlers');
  });

  it('should have a valid SMSGateway property', () => {
    expect(developmentConfig).toHaveProperty('SMSGateway');
  });

  it('should have a valid SMS_SystemId property', () => {
    expect(developmentConfig).toHaveProperty('SMS_SystemId');
  });

  it('should have a valid SMS_Password property', () => {
    expect(developmentConfig).toHaveProperty('SMS_Password');
  });

  it('should have a valid SMS_System_Type property', () => {
    expect(developmentConfig).toHaveProperty('SMS_System_Type');
  });

  it('should have a valid logDirPerEnvironment property', () => {
    expect(developmentConfig).toHaveProperty('logDirPerEnvironment');
  });

  it('should have a valid SendEmails property', () => {
    expect(developmentConfig).toHaveProperty('SendEmails');
  });

  it('should have a valid TimeZone property', () => {
    expect(developmentConfig).toHaveProperty('TimeZone');
  });

  it('should have a valid redisHost property', () => {
    expect(developmentConfig).toHaveProperty('redisHost');
  });

  it('should have a valid redisPort property', () => {
    expect(developmentConfig).toHaveProperty('redisPort');
  });

  it('should have a valid postgres_b2b_database property', () => {
    expect(developmentConfig).toHaveProperty('postgres_b2b_database');
  });

  // Nested properties (e.g., `postgres_b2b_database`)
  it('should have a valid postgres_b2b_database.host property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty('host');
  });

  it('should have a valid postgres_b2b_database.port property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty('port');
  });

  it('should have a valid postgres_b2b_database.db property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty('db');
  });

  it('should have a valid postgres_b2b_database.username property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty('username');
  });

  it('should have a valid postgres_b2b_database.schemaName property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'schemaName'
    );
  });

  it('should have a valid postgres_b2b_database.debugMode property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty('debugMode');
  });

  it('should have a valid postgres_b2b_database.minConnections property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'minConnections'
    );
  });

  it('should have a valid postgres_b2b_database.maxConnections property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'maxConnections'
    );
  });

  it('should have a valid postgres_b2b_database.sequelizeMinConnections property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'sequelizeMinConnections'
    );
  });

  it('should have a valid postgres_b2b_database.sequelizeMaxConnections property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'sequelizeMaxConnections'
    );
  });

  it('should have a valid postgres_b2b_database.applicationName property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'applicationName'
    );
  });

  it('should have a valid postgres_b2b_database.applicationNameSequelize property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'applicationNameSequelize'
    );
  });

  it('should have a valid postgres_b2b_database.acquire property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty('acquire');
  });

  it('should have a valid postgres_b2b_database.idleTimeout property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'idleTimeout'
    );
  });

  it('should have a valid postgres_b2b_database.connectionTimeout property', () => {
    expect(developmentConfig.postgres_b2b_database).toHaveProperty(
      'connectionTimeout'
    );
  });

  it('should have a valid api property', () => {
    expect(developmentConfig).toHaveProperty('api');
  });

  it('should have a valid api.process property', () => {
    expect(developmentConfig.api).toHaveProperty('process');
  });

  it('should have a valid api.user property', () => {
    expect(developmentConfig.api).toHaveProperty('user');
  });

  it('should have a valid logging property', () => {
    expect(developmentConfig).toHaveProperty('logging');
  });

  it('should have a valid logging.applicationLoggingLevel property', () => {
    expect(developmentConfig.logging).toHaveProperty('applicationLoggingLevel');
  });

  it('should have a valid TICKET_ITEMS_PER_PAGE property', () => {
    expect(developmentConfig).toHaveProperty('TICKET_ITEMS_PER_PAGE');
  });

  it('should have a valid CaptchaIsActive property', () => {
    expect(developmentConfig).toHaveProperty('CaptchaIsActive');
  });

  it('should have a valid CaptchaIsActiveForPasswordReset property', () => {
    expect(developmentConfig).toHaveProperty('CaptchaIsActiveForPasswordReset');
  });

  it('should have a valid CaptchaV3Threshold property', () => {
    expect(developmentConfig).toHaveProperty('CaptchaV3Threshold');
  });

  it('should have a valid TwoFactorEnabled property', () => {
    expect(developmentConfig).toHaveProperty('TwoFactorEnabled');
  });

  it('should have a valid TwoFactorEnabledForPasswordReset property', () => {
    expect(developmentConfig).toHaveProperty(
      'TwoFactorEnabledForPasswordReset'
    );
  });

  it('should have a valid TwoFactorDigitsLength property', () => {
    expect(developmentConfig).toHaveProperty('TwoFactorDigitsLength');
  });

  it('should have a valid TwoFactorValiditySeconds property', () => {
    expect(developmentConfig).toHaveProperty('TwoFactorValiditySeconds');
  });

  it('should have a valid ShowCookieConsentBanner property', () => {
    expect(developmentConfig).toHaveProperty('ShowCookieConsentBanner');
  });

  it('should have a valid SessionMaxAge property', () => {
    expect(developmentConfig).toHaveProperty('SessionMaxAge');
  });

  it('should have a valid SessionUpdateAge property', () => {
    expect(developmentConfig).toHaveProperty('SessionUpdateAge');
  });

  it('should have a valid SessionExpirationPopupShownInSeconds property', () => {
    expect(developmentConfig).toHaveProperty(
      'SessionExpirationPopupShownInSeconds'
    );
  });

  it('should have a valid PasswordComplexityActive property', () => {
    expect(developmentConfig).toHaveProperty('PasswordComplexityActive');
  });

  it('should have a valid MinimumPasswordCharacters property', () => {
    expect(developmentConfig).toHaveProperty('MinimumPasswordCharacters');
  });

  it('should have a valid EmailRelayServerIP property', () => {
    expect(developmentConfig).toHaveProperty('EmailRelayServerIP');
  });

  it('should have a valid EmailRelayServerTCPPort property', () => {
    expect(developmentConfig).toHaveProperty('EmailRelayServerTCPPort');
  });

  it('should have a valid EmailFromAddress property', () => {
    expect(developmentConfig).toHaveProperty('EmailFromAddress');
  });

  it('should have a valid userCreationSecureLinkValidity property', () => {
    expect(developmentConfig).toHaveProperty('userCreationSecureLinkValidity');
  });

  it('should have a valid cookieConsentValidityInDays property', () => {
    expect(developmentConfig).toHaveProperty('cookieConsentValidityInDays');
  });

  it('should have a valid maxOTPAttemps property', () => {
    expect(developmentConfig).toHaveProperty('maxOTPAttemps');
  });

  it('should have a valid maxOTPAttemptsBanTimeInSec property', () => {
    expect(developmentConfig).toHaveProperty('maxOTPAttemptsBanTimeInSec');
  });

  it('should have a valid totpJWTTokenCookieValidityInSec property', () => {
    expect(developmentConfig).toHaveProperty('totpJWTTokenCookieValidityInSec');
  });

  it('should have a valid maxTokenAttempts property', () => {
    expect(developmentConfig).toHaveProperty('maxTokenAttempts');
  });

  it('should have a valid maxTokenAttemptsBanTimeInSec property', () => {
    expect(developmentConfig).toHaveProperty('maxTokenAttemptsBanTimeInSec');
  });

  it('should have a valid emailJWTTokenCookieValidityInSec property', () => {
    expect(developmentConfig).toHaveProperty(
      'emailJWTTokenCookieValidityInSec'
    );
  });

  it('should have a valid databaseIDOfTicketingSystemCompany property', () => {
    expect(developmentConfig).toHaveProperty(
      'databaseIDOfTicketingSystemCompany'
    );
  });
});
