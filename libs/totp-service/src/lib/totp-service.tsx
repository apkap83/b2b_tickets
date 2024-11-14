'use server';
//@ts-ignore
import smpp from 'smpp';
import { config } from '@b2b-tickets/config';
import { getRequestLogger } from '@b2b-tickets/server-actions/server';

import { CustomLogger } from '@b2b-tickets/logging';
import { TransportName, EmailTemplate } from '@b2b-tickets/shared-models';
import { B2BUser } from '@b2b-tickets/db-access';
export async function sendOTP(destinationAddr: string, OTPCode: string) {
  const logRequest: CustomLogger = await getRequestLogger(TransportName.AUTH);
  try {
    logRequest.info(
      `Trying to send SMS towards: ${destinationAddr} with OTP Code: ${OTPCode} using ${config.SMSGateway}`
    );

    // Step 1: Check if user exists
    const user = await B2BUser.findOne({
      where: { mobile_phone: destinationAddr },
    });

    if (!user) {
      logRequest.error(
        `User with mobile ${destinationAddr} was not found. SMS will not be sent.`
      );
      return;
    }

    // Step 2: Check if the new OTP is the same as the last one sent
    if (user.lastotpsent === OTPCode) {
      // logRequest.info(`The OTP code is the same as the last OTP sent. SMS will not be sent to ${destinationAddr}.`);
      return; // Exit if the OTP code is the same as the previous one
    }

    logRequest.info(
      `User found for mobile ${destinationAddr}. Preparing to send SMS with OTP Code: ${OTPCode} using ${config.SMSGateway}`
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
                  destination_addr: destinationAddr,
                  short_message: `Your OTP Code: ${OTPCode}`,
                },
                async (pdu: any) => {
                  if (pdu.command_status === 0) {
                    // Message successfully sent
                    logRequest.info(
                      `SMS towards: ${destinationAddr} was successfully sent - Message ID: ${pdu.message_id}`
                    );

                    // Step 4: Update the lastOTPSent field after successful SMS send
                    user.lastotpsent = OTPCode; // Save the new OTP code
                    await user.save();
                    logRequest.info(
                      `User with mobile ${destinationAddr} updated with new lastOTPSent: ${user.lastotpsent}`
                    );
                  } else {
                    logRequest.error(
                      `SMS towards: ${destinationAddr} failed to be sent - pdu.command_status: ${pdu.command_status}`
                    );
                  }
                  // Unbind and close session after sending
                  session.unbind();
                }
              );
            } else {
              logRequest.error(
                `SMS towards: ${destinationAddr} - Failed to bind transceiver:', ${pdu.command_status}`
              );
              session.close();
            }
          }
        );
      }
    );

    session.on('error', (error: unknown) => {
      logRequest.error(
        `SMS towards: ${destinationAddr} - SMPP Session Error: ${error}`
      );
    });
  } catch (error) {
    logRequest.info(`Error During sending SMS Message ${error}`);
  }
}
