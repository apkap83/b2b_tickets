'use server';
//@ts-ignore
import smpp, { Session, PDU } from 'smpp';
import { config } from '@b2b-tickets/config';

export async function sendSms(destinationAddr: string, shortMessage: string) {
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
        },
        (pdu: any) => {
          if (pdu.command_status === 0) {
            // Successfully bound
            session.submit_sm(
              {
                destination_addr: destinationAddr,
                short_message: shortMessage,
              },
              (pdu: any) => {
                if (pdu.command_status === 0) {
                  // Message successfully sent
                  console.log('Message ID:', pdu.message_id);
                } else {
                  console.error('Failed to send message:', pdu.command_status);
                }
                // Unbind and close session after sending
                session.unbind();
              }
            );
          } else {
            console.error('Failed to bind transceiver:', pdu.command_status);
            session.close();
          }
        }
      );
    }
  );

  session.on('error', (error: unknown) => {
    console.error('SMPP Session Error:', error);
  });
}
