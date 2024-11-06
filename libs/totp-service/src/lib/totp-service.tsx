//@ts-ignore
import smpp, { Session, PDU } from 'smpp';

interface SMPPConfig {
  url: string;
  auto_enquire_link_period: number;
  debug: boolean;
}

interface BindOptions {
  system_id: string;
  password: string;
}

interface MessageOptions {
  destination_addr: string;
  short_message: string;
}

const SMPP_SERVER_CONFIG: SMPPConfig = {
  url: 'smpp://example.com:2775',
  auto_enquire_link_period: 10000,
  debug: true,
};

const BIND_OPTIONS: BindOptions = {
  system_id: 'YOUR_SYSTEM_ID',
  password: 'YOUR_PASSWORD',
};

const MESSAGE_OPTIONS: MessageOptions = {
  destination_addr: 'DESTINATION NUMBER',
  short_message: 'Hello!',
};

async function connectToSMPP(config: SMPPConfig): Promise<Session> {
  const session = smpp.connect(config);

  return new Promise<Session>((resolve, reject) => {
    session.once('connect', () => resolve(session));
    session.once('error', (err: Error) => reject(err));
  });
}

async function bindTransceiver(
  session: Session,
  options: BindOptions
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    session.bind_transceiver(options, (pdu: PDU) => {
      if (pdu.command_status === 0) {
        // Successfully bound
        resolve();
      } else {
        reject(new Error('Failed to bind transceiver'));
      }
    });
  });
}

async function submitSM(
  session: Session,
  options: MessageOptions
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    session.submit_sm(options, (pdu: PDU) => {
      if (pdu.command_status === 0) {
        // Message successfully sent
        console.log(pdu.message_id);
        resolve();
      } else {
        reject(new Error('Failed to send message'));
      }
    });
  });
}

async function sendSMPPMessage() {
  try {
    const session = await connectToSMPP(SMPP_SERVER_CONFIG);
    await bindTransceiver(session, BIND_OPTIONS);
    await submitSM(session, MESSAGE_OPTIONS);
  } catch (error) {
    console.error('Error:', error);
  }
}

sendSMPPMessage();
