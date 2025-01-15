'use server';
//@ts-ignore
import smpp from 'smpp';
import { config } from '@b2b-tickets/config';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';

import { CustomLogger } from '@b2b-tickets/logging';
import { TransportName, B2BUserType } from '@b2b-tickets/shared-models';
import { B2BUser } from '@b2b-tickets/db-access';
import { symmetricDecrypt, symmetricEncrypt } from '@b2b-tickets/utils';
import { sendEmailForTOTPCode } from '@b2b-tickets/email-service/server';
import { EmailNotificationType } from '@b2b-tickets/shared-models';

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
