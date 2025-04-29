import { productionConfig } from '../production';

describe('productionConfig', () => {
  // Top-level properties
  it('should have a valid webSiteUrl property', () => {
    expect(productionConfig).toHaveProperty('webSiteUrl');
  });

  it('should have a valid emailListOfHandlers property', () => {
    expect(productionConfig).toHaveProperty('emailListOfHandlers');
  });

  it('should have a valid SMSGateway property', () => {
    expect(productionConfig).toHaveProperty('SMSGateway');
  });

  it('should have a valid SMS_SystemId property', () => {
    expect(productionConfig).toHaveProperty('SMS_SystemId');
  });

  it('should have a valid SMS_Password property', () => {
    expect(productionConfig).toHaveProperty('SMS_Password');
  });

  it('should have a valid SMS_System_Type property', () => {
    expect(productionConfig).toHaveProperty('SMS_System_Type');
  });

  it('should have a valid logDirPerEnvironment property', () => {
    expect(productionConfig).toHaveProperty('logDirPerEnvironment');
  });

  it('should have a valid SendEmails property', () => {
    expect(productionConfig).toHaveProperty('SendEmails');
  });

  it('should have a valid TimeZone property', () => {
    expect(productionConfig).toHaveProperty('TimeZone');
  });

  it('should have a valid redisHost property', () => {
    expect(productionConfig).toHaveProperty('redisHost');
  });

  it('should have a valid redisPort property', () => {
    expect(productionConfig).toHaveProperty('redisPort');
  });

  it('should have a valid postgres_b2b_database property', () => {
    expect(productionConfig).toHaveProperty('postgres_b2b_database');
  });

  // Nested properties (e.g., `postgres_b2b_database`)
  it('should have a valid postgres_b2b_database.host property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty('host');
  });

  it('should have a valid postgres_b2b_database.port property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty('port');
  });

  it('should have a valid postgres_b2b_database.db property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty('db');
  });

  it('should have a valid postgres_b2b_database.username property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty('username');
  });

  it('should have a valid postgres_b2b_database.schemaName property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty('schemaName');
  });

  it('should have a valid postgres_b2b_database.debugMode property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty('debugMode');
  });

  it('should have a valid postgres_b2b_database.minConnections property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'minConnections'
    );
  });

  it('should have a valid postgres_b2b_database.maxConnections property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'maxConnections'
    );
  });

  it('should have a valid postgres_b2b_database.sequelizeMinConnections property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'sequelizeMinConnections'
    );
  });

  it('should have a valid postgres_b2b_database.sequelizeMaxConnections property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'sequelizeMaxConnections'
    );
  });

  it('should have a valid postgres_b2b_database.applicationName property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'applicationName'
    );
  });

  it('should have a valid postgres_b2b_database.applicationNameSequelize property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'applicationNameSequelize'
    );
  });

  it('should have a valid postgres_b2b_database.acquire property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty('acquire');
  });

  it('should have a valid postgres_b2b_database.idleTimeout property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'idleTimeout'
    );
  });

  it('should have a valid postgres_b2b_database.connectionTimeout property', () => {
    expect(productionConfig.postgres_b2b_database).toHaveProperty(
      'connectionTimeout'
    );
  });

  it('should have a valid api property', () => {
    expect(productionConfig).toHaveProperty('api');
  });

  it('should have a valid api.process property', () => {
    expect(productionConfig.api).toHaveProperty('process');
  });

  it('should have a valid api.user property', () => {
    expect(productionConfig.api).toHaveProperty('user');
  });

  it('should have a valid logging property', () => {
    expect(productionConfig).toHaveProperty('logging');
  });

  it('should have a valid logging.applicationLoggingLevel property', () => {
    expect(productionConfig.logging).toHaveProperty('applicationLoggingLevel');
  });

  it('should have a valid TICKET_ITEMS_PER_PAGE property', () => {
    expect(productionConfig).toHaveProperty('TICKET_ITEMS_PER_PAGE');
  });

  it('should have a valid CaptchaIsActive property', () => {
    expect(productionConfig).toHaveProperty('CaptchaIsActive');
  });

  it('should have a valid CaptchaIsActiveForPasswordReset property', () => {
    expect(productionConfig).toHaveProperty('CaptchaIsActiveForPasswordReset');
  });

  it('should have a valid CaptchaV3Threshold property', () => {
    expect(productionConfig).toHaveProperty('CaptchaV3Threshold');
  });

  it('should have a valid TwoFactorEnabled property', () => {
    expect(productionConfig).toHaveProperty('TwoFactorEnabled');
  });

  it('should have a valid TwoFactorEnabledForPasswordReset property', () => {
    expect(productionConfig).toHaveProperty('TwoFactorEnabledForPasswordReset');
  });

  it('should have a valid TwoFactorDigitsLength property', () => {
    expect(productionConfig).toHaveProperty('TwoFactorDigitsLength');
  });

  it('should have a valid TwoFactorValiditySeconds property', () => {
    expect(productionConfig).toHaveProperty('TwoFactorValiditySeconds');
  });

  it('should have a valid ShowCookieConsentBanner property', () => {
    expect(productionConfig).toHaveProperty('ShowCookieConsentBanner');
  });

  it('should have a valid SessionMaxAge property', () => {
    expect(productionConfig).toHaveProperty('SessionMaxAge');
  });

  it('should have a valid SessionUpdateAge property', () => {
    expect(productionConfig).toHaveProperty('SessionUpdateAge');
  });

  it('should have a valid SessionExpirationPopupShownInSeconds property', () => {
    expect(productionConfig).toHaveProperty(
      'SessionExpirationPopupShownInSeconds'
    );
  });

  it('should have a valid PasswordComplexityActive property', () => {
    expect(productionConfig).toHaveProperty('PasswordComplexityActive');
  });

  it('should have a valid MinimumPasswordCharacters property', () => {
    expect(productionConfig).toHaveProperty('MinimumPasswordCharacters');
  });

  it('should have a valid EmailRelayServerIP property', () => {
    expect(productionConfig).toHaveProperty('EmailRelayServerIP');
  });

  it('should have a valid EmailRelayServerTCPPort property', () => {
    expect(productionConfig).toHaveProperty('EmailRelayServerTCPPort');
  });

  it('should have a valid EmailFromAddress property', () => {
    expect(productionConfig).toHaveProperty('EmailFromAddress');
  });

  it('should have a valid userCreationSecureLinkValidity property', () => {
    expect(productionConfig).toHaveProperty('userCreationSecureLinkValidity');
  });

  it('should have a valid cookieConsentValidityInDays property', () => {
    expect(productionConfig).toHaveProperty('cookieConsentValidityInDays');
  });

  it('should have a valid maxOTPAttemps property', () => {
    expect(productionConfig).toHaveProperty('maxOTPAttemps');
  });

  it('should have a valid maxOTPAttemptsBanTimeInSec property', () => {
    expect(productionConfig).toHaveProperty('maxOTPAttemptsBanTimeInSec');
  });

  it('should have a valid totpJWTTokenCookieValidityInSec property', () => {
    expect(productionConfig).toHaveProperty('totpJWTTokenCookieValidityInSec');
  });

  it('should have a valid maxTokenAttempts property', () => {
    expect(productionConfig).toHaveProperty('maxTokenAttempts');
  });

  it('should have a valid maxTokenAttemptsBanTimeInSec property', () => {
    expect(productionConfig).toHaveProperty('maxTokenAttemptsBanTimeInSec');
  });

  it('should have a valid emailJWTTokenCookieValidityInSec property', () => {
    expect(productionConfig).toHaveProperty('emailJWTTokenCookieValidityInSec');
  });

  it('should have a valid databaseIDOfTicketingSystemCompany property', () => {
    expect(productionConfig).toHaveProperty(
      'databaseIDOfTicketingSystemCompany'
    );
  });
});
