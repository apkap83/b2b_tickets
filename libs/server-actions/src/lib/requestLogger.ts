// utils/requestLogger.ts - used for server-side only
import { headers } from 'next/headers';
import { createRequestLogger } from '@b2b-tickets/logging';
import { TransportName } from '@b2b-tickets/shared-models';

export function getRequestLogger(transportName: TransportName) {
  const headersList = headers();
  const reqIP = headersList.get('request-ip') || 'unknown-ip';
  const reqURL = headersList.get('request-url') || 'unknown-url';
  const sessionId = headersList.get('session-id') || 'unknown-session';

  const logRequest = createRequestLogger(
    transportName,
    reqIP,
    reqURL,
    sessionId
  );

  return logRequest;
}
