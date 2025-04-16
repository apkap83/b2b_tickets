'use server';
//@ts-ignore
import smpp from 'smpp';
import { config } from '@b2b-tickets/config';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';

import { CustomLogger } from '@b2b-tickets/logging';
import { TransportName, B2BUserType } from '@b2b-tickets/shared-models';
import { B2BUser } from '@b2b-tickets/db-access';
import {
  symmetricDecrypt,
  symmetricEncrypt,
  generateOtp,
} from '@b2b-tickets/utils';
import { sendEmailForTOTPCode } from '@b2b-tickets/email-service/server';
import { EmailNotificationType } from '@b2b-tickets/shared-models';

import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '@b2b-tickets/redis-service';
import { NextApiRequest } from 'next';

export async function sendOTP(userName: string, OTPCode: string) {
  const logRequest: CustomLogger = await getRequestLogger(TransportName.AUTH);
  try {
    // Step 1: Check if user exists
    // TODO Add Index There
    const user: B2BUserType = await B2BUser.scope('withPassword').findOne({
      where: { username: userName },
    });

    if (!user) {
      logRequest.error(
        `User with user name ${userName} was not found. TOTP will not be sent.`
      );
      return;
    }

    logRequest.info(
      `Trying to send TOTP for user: ${userName} with OTP Code: ${OTPCode} using MFA Method: ${user.mfa_method}`
    );

    // Step 2: Check if the new OTP is the same as the last one sent
    if (user.lastotpsent) {
      // Decrypt the saved OTP
      const lastOtpSentDecrypted = symmetricDecrypt(user.lastotpsent);
      if (lastOtpSentDecrypted === OTPCode) return;
    }

    // Mobile MFA Method
    if (user.mfa_method === 'm') {
      // Check if Mobile Phone is Defined For User
      if (user.mobile_phone == null || user.mobile_phone === '') {
        return logRequest.error(
          `No mobile phone is defined for Mobile MFA Method for user: ${user.username}`
        );
      }

      logRequest.info(
        `User found for mobile ${user.mobile_phone}. Preparing to send SMS with OTP Code: ${OTPCode} using ${config.SMSGateway}`
      );

      const session = smpp.connect(
        {
          url: config.SMSGateway,
          auto_enquire_link_period: 10000,
          debug: true,
        },
        () => {
          session.bind_transceiver(
            {
              system_id: config.SMS_SystemId,
              password: config.SMS_Password,
              system_type: config.SMS_System_Type,
            },
            (pdu: any) => {
              if (pdu.command_status === 0) {
                // Successfully bound
                session.submit_sm(
                  {
                    destination_addr: user.mobile_phone,
                    short_message: `Your OTP Code: ${OTPCode}`,
                  },
                  async (pdu: any) => {
                    if (pdu.command_status === 0) {
                      // Message successfully sent
                      logRequest.info(
                        `SMS towards: ${user.mobile_phone} was successfully sent - Message ID: ${pdu.message_id}`
                      );

                      // Step 4: Update the lastOTPSent field after successful SMS send
                      const encryptedOTP = symmetricEncrypt(OTPCode);
                      await B2BUser.update(
                        { lastotpsent: encryptedOTP }, // The field to update
                        { where: { user_id: user.user_id } } // The condition to identify the correct user
                      );

                      //@ts-ignore
                      await user.save();
                      logRequest.info(
                        `User with mobile ${user.mobile_phone} updated with new lastOTPSent: ${user.lastotpsent}`
                      );
                    } else {
                      logRequest.error(
                        `SMS towards: ${user.mobile_phone} failed to be sent - pdu.command_status: ${pdu.command_status}`
                      );
                    }
                    // Unbind and close session after sending
                    session.unbind();
                  }
                );
              } else {
                logRequest.error(
                  `SMS towards: ${user.mobile_phone} - Failed to bind transceiver:', ${pdu.command_status}`
                );
                session.close();
              }
            }
          );
        }
      );

      session.on('error', (error: unknown) => {
        logRequest.error(
          `SMS towards: ${user.mobile_phone} - SMPP Session Error: ${error}`
        );
      });
    }

    // Email MFA Method
    if (user.mfa_method === 'e') {
      // Check if Email Address is Defined for User
      if (user.email == null || user.email === '') {
        return logRequest.error(
          `No Email address is defined for Email MFA Method for user: ${user.username}`
        );
      }

      await sendEmailForTOTPCode(
        EmailNotificationType.TOTP_BY_EMAIL,
        user.email as string,
        OTPCode
      );

      // Update the lastOTPSent field after successful TOTP send
      const encryptedOTP = symmetricEncrypt(OTPCode);
      await B2BUser.update(
        { lastotpsent: encryptedOTP },
        { where: { user_id: user.user_id } }
      );

      //@ts-ignore
      await user.save();
      logRequest.info(
        `User with mobile ${user.mobile_phone} updated with new lastOTPSent: ${user.lastotpsent}`
      );
    }
  } catch (error) {
    logRequest.info(`Error During sending TOTP Message ${error}`);
  }
}

export async function logFaultyOTPAttempt(req: NextRequest): Promise<{
  eligibleForNewOtpAttempt: boolean;
  remainingOTPAttempts: number;
}> {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const key = `otp_attempts:${ip}`;

  let numfOfAttemptsInRedis = Number(await redisClient.get(key)) || 0;

  await redisClient.set(
    key,
    numfOfAttemptsInRedis + 1,
    'EX',
    config.maxOTPAttemptsBanTimeInSec
  );

  numfOfAttemptsInRedis += 1;

  const remainingOTPAttempts = config.maxOTPAttemps - numfOfAttemptsInRedis;

  if (numfOfAttemptsInRedis >= config.maxOTPAttemps) {
    return {
      eligibleForNewOtpAttempt: false,
      remainingOTPAttempts: 0,
    };
  }

  return {
    eligibleForNewOtpAttempt: true,
    remainingOTPAttempts,
  };
}

export async function clearFaultyOTPAttempts(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const key = `otp_attempts:${ip}`;

  // Clear OTP Attempts on Success
  await redisClient.del(key);
}

export async function logTokenOTPAttempt(req: NextRequest): Promise<{
  eligibleForNewOtpAttempt: boolean;
  remainingOTPAttempts: number;
}> {
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  const key = `token_attempts:${ip}`;

  let numfOfAttemptsInRedis = Number(await redisClient.get(key)) || 0;

  await redisClient.set(
    key,
    numfOfAttemptsInRedis + 1,
    'EX',
    config.TwoFactorValiditySeconds
  );

  numfOfAttemptsInRedis += 1;

  const remainingOTPAttempts = config.maxTokenAttempts - numfOfAttemptsInRedis;

  if (numfOfAttemptsInRedis >= config.maxTokenAttempts) {
    return {
      eligibleForNewOtpAttempt: false,
      remainingOTPAttempts: 0,
    };
  }

  return {
    eligibleForNewOtpAttempt: true,
    remainingOTPAttempts,
  };
}

export async function generateAndRedisStoreNewOTPForUser(
  req: NextApiRequest,
  definedUsername?: string
): Promise<string | undefined> {
  const logRequest: CustomLogger = await getRequestLogger(TransportName.AUTH);
  try {
    const newOTP = generateOtp(config.TwoFactorDigitsLength);

    const ip =
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userName = definedUsername || req.body['userName'];
    const key = `otp_value:${ip}:${userName}`;

    // Verify if OTP Value for User already exists in Redis
    const savedOTP = await redisClient.get(key);

    // Return saved OTP from Redis
    if (savedOTP) return savedOTP;

    await redisClient.set(key, newOTP, 'EX', config.TwoFactorValiditySeconds);
    logRequest.info(`'*** OTP Code: ${newOTP}`);
    return newOTP;
  } catch (error) {
    logRequest.error(error);
    // throw error;
  }
}

export async function validateOTPCodeForUserThroughRedis(
  req: NextApiRequest,
  userProvidedOTP: string
): Promise<
  | {
      eligibleForNewOtpAttempt: boolean;
      remainingOTPAttempts: number;
    }
  | boolean
  | undefined
> {
  const logRequest: CustomLogger = await getRequestLogger(TransportName.AUTH);
  try {
    const ip =
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userName = req.body['userName'];
    const keyOTPValue = `otp_value:${ip}:${userName}`;
    const keyOtpAttempts = `otp_attempts:${ip}:${userName}`;

    const savedOTP = await redisClient.get(keyOTPValue);

    // Wrong OTP Provided By User
    if (userProvidedOTP !== savedOTP) {
      let numfOfAttemptsInRedis =
        Number(await redisClient.get(keyOtpAttempts)) || 0;

      await redisClient.set(
        keyOtpAttempts,
        numfOfAttemptsInRedis + 1,
        'EX',
        config.maxOTPAttemptsBanTimeInSec
      );

      numfOfAttemptsInRedis += 1;

      const remainingOTPAttempts = config.maxOTPAttemps - numfOfAttemptsInRedis;

      if (numfOfAttemptsInRedis >= config.maxOTPAttemps) {
        // Max OTP Attempts - Clear OTP Value
        await redisClient.del(keyOTPValue);

        return {
          eligibleForNewOtpAttempt: false,
          remainingOTPAttempts: 0,
        };
      }

      return {
        eligibleForNewOtpAttempt: true,
        remainingOTPAttempts,
      };
    }

    // User passed OTP test successfully - Clear both OTP and Attempts
    await redisClient.del(keyOtpAttempts);
    await redisClient.del(keyOTPValue);

    return true;
  } catch (error) {
    logRequest.error(error);
    // throw error;
  }
}

export async function maxOTPAttemptsReached(
  req: NextApiRequest,
  definedUserName?: string
) {
  const logRequest: CustomLogger = await getRequestLogger(TransportName.AUTH);

  try {
    const ip =
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userName = definedUserName || req.body['userName'];
    const keyOtpAttempts = `otp_attempts:${ip}:${userName}`;

    const numOfOTPAttempts = (await redisClient.get(keyOtpAttempts)) || 0;
    if (Number(numOfOTPAttempts) >= Number(config.maxOTPAttemps)) {
      return true;
    }
    return false;
  } catch (error) {
    logRequest.error(error);
  }
}
